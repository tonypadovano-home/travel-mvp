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

// ------------------- Existing Endpoints ------------------- //

// Get travel recommendations with AI toggle and save to database
app.post('/api/recommend', async (req, res) => {
  try {
    const { destination, useAI } = req.body;
    if (!destination) {
      return res.status(400).json({ error: 'Destination is required' });
    }

    let recommendation;
    let mode = 'Mock';

    // Mock data
    const mockRecommendations = {
      Paris: '1. Visit the Eiffel Tower early morning. 2. Try local croissants. 3. Get a Museum Pass.',
      Tokyo: '1. Get a Suica card. 2. Try conveyor belt sushi. 3. Visit temples early.',
      'New York': '1. Walk the High Line. 2. Visit museums on weekdays. 3. Try pizza by the slice.',
      London: '1. Use an Oyster card. 2. Visit museums during weekdays. 3. Try afternoon tea.',
      Rome: '1. Book Colosseum tickets online. 2. Explore Trastevere. 3. Dress modestly in churches.',
    };

    if (useAI) {
      try {
        const OpenAI = require('openai');
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

        const completion = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: 'You are a helpful travel assistant. Provide concise tips.' },
            { role: 'user', content: `Give 3 quick tips for visiting ${destination}. Keep it short.` },
          ],
          max_tokens: 200,
        });

        recommendation = completion.choices[0].message.content;
        mode = 'AI';
      } catch (aiError) {
        console.error('OpenAI API Error:', aiError.message);
        return res.status(503).json({ error: `AI mode failed: ${aiError.message}`, mode: 'AI (Failed)' });
      }
    } else {
      recommendation = mockRecommendations[destination] || 
        `1. Research the local culture in ${destination}. 2. Try local cuisine. 3. Learn basic phrases.`;
    }

    const { data, error } = await supabase
      .from('destinations')
      .insert([{ destination, recommendation }])
      .select();

    if (error) {
      console.error('Supabase error:', error);
      return res.status(500).json({ error: 'Failed to save to database' });
    }

    res.json({ destination, recommendation, saved: true, id: data[0].id, mode });
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

    if (error) throw error;

    res.json({ destinations: data });
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ error: 'Failed to fetch destinations' });
  }
});

// Delete all destinations
app.delete('/api/destinations', async (req, res) => {
  try {
    const { error } = await supabase.from('destinations').delete().neq('id', 0);
    if (error) throw error;
    res.json({ success: true, message: 'History cleared' });
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ error: 'Failed to clear history' });
  }
});

// ------------------- New Endpoint: Vibe Search ------------------- //
app.post('/api/vibe-search', async (req, res) => {
  try {
    const { vibeDescription } = req.body;
    if (!vibeDescription) return res.status(400).json({ error: 'Vibe description is required' });

    // Fetch all destinations
    const { data: destinations, error } = await supabase.from('destinations').select('*');
    if (error) throw error;

    // Filter out top visited destinations
    const MAX_VISITS = 5000000; // adjust as needed
    const filtered = destinations.filter(d => !d.visitsPerYear || d.visitsPerYear < MAX_VISITS);

    // Match vibe description against tags
    const matches = filtered
      .map(d => {
        const keywords = d.tags || [];
        const matchScore = keywords.reduce((score, tag) => {
          return vibeDescription.toLowerCase().includes(tag.toLowerCase()) ? score + 1 : score;
        }, 0);
        return { ...d, matchScore };
      })
      .filter(d => d.matchScore > 0)
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, 10); // top 10 matches

    res.json({ matches });
  } catch (error) {
    console.error('Vibe Search Error:', error);
    res.status(500).json({ error: 'Failed to find matches' });
  }
});

// ------------------- Start Server ------------------- //
app.listen(port, () => console.log(`Backend listening on ${port}`));
