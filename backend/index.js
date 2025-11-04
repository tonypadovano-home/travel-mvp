const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const app = express();
const port = process.env.PORT || 4000;

// Initialize Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Enable CORS and JSON parsing
app.use(cors());
app.use(express.json());

// Test endpoint
app.get('/api/ping', (req, res) => res.json({ msg: 'pong' }));

// Get travel recommendations with AI toggle and save to database
app.post('/api/recommend', async (req, res) => {
  try {
    const { destination, useAI } = req.body;
    console.log('Received request:', { destination, useAI, bodyType: typeof useAI });
    if (!destination) {
      return res.status(400).json({ error: 'Destination is required' });
    }

    let recommendation;
    let mode = 'Mock';

    // Mock data for fallback
    const mockRecommendations = {
      'Paris': '1. Visit the Eiffel Tower early morning to avoid crowds. 2. Try authentic croissants at local boulangeries. 3. Get a Museum Pass for unlimited entries to major attractions.',
      'Tokyo': '1. Get a Suica card for easy subway travel. 2. Try conveyor belt sushi for an authentic experience. 3. Visit temples early in the morning for peaceful moments.',
      'New York': '1. Walk the High Line for unique city views. 2. Visit museums on weekday mornings to skip crowds. 3. Try pizza by the slice from local spots.',
      'London': '1. Use an Oyster card for the Tube to save money. 2. Visit museums during weekdays as most are free. 3. Try traditional afternoon tea at a local café.',
      'Rome': '1. Book Colosseum tickets online to skip long lines. 2. Explore Trastevere neighborhood for authentic Italian cuisine. 3. Dress modestly when visiting Vatican and churches.',
    };

    if (useAI) {
      // Try real OpenAI call
      try {
        const OpenAI = require('openai');
        const openai = new OpenAI({
          apiKey: process.env.OPENAI_API_KEY,
        });

        const completion = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: "You are a helpful travel assistant. Provide concise, practical travel recommendations."
            },
            {
              role: "user",
              content: `Give me 3 quick travel tips for visiting ${destination}. Keep each tip to one sentence.`
            }
          ],
          max_tokens: 200,
        });

        recommendation = completion.choices[0].message.content;
        mode = 'AI';
      } catch (aiError) {
        console.error('OpenAI API Error:', aiError.message);
        // Return error to user so they know AI mode failed
        return res.status(503).json({ 
          error: `AI mode failed: ${aiError.message}. Try toggling to Mock mode.`,
          mode: 'AI (Failed)'
        });
      }
    } else {
      // Use mock data
      recommendation = mockRecommendations[destination] || 
        `1. Research the local culture before visiting ${destination}. 2. Try the local cuisine at family-owned restaurants. 3. Learn a few basic phrases in the local language.`;
    }
    
    // Save to Supabase
    const { data, error } = await supabase
      .from('destinations')
      .insert([{ destination, recommendation }])
      .select();

    if (error) {
      console.error('Supabase error:', error);
      return res.status(500).json({ error: 'Failed to save to database' });
    }

    res.json({ 
      destination,
      recommendation,
      saved: true,
      id: data[0].id,
      mode: mode
    });

  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ error: 'Failed to get recommendation' });
  }
});

// Get all saved destinations
app.get('/api/destinations', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('destinations')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('Supabase error:', error);
      return res.status(500).json({ error: 'Failed to fetch destinations' });
    }

    res.json({ destinations: data });
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ error: 'Failed to fetch destinations' });
  }
});

// Delete all destinations
app.delete('/api/destinations', async (req, res) => {
  try {
    const { error } = await supabase
      .from('destinations')
      .delete()
      .neq('id', 0); // Delete all rows (neq with impossible condition deletes everything)

    if (error) {
      console.error('Supabase error:', error);
      return res.status(500).json({ error: 'Failed to clear history' });
    }

    res.json({ success: true, message: 'History cleared' });
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ error: 'Failed to clear history' });
  }
});

app.listen(port, () => console.log(`Backend listening on ${port}`));