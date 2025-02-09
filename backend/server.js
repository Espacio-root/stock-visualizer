const express = require("express");
const axios = require("axios");
const cors = require("cors");
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Endpoint to get historical stock data
app.get("/stock/:symbol", async (req, res) => {
    try {
        const symbol = req.params.symbol;
        const response = await axios.get(
            `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?range=1mo&interval=1d`
        );
        res.json(response.data);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error fetching stock data" });
    }
});

// Function to extract recommendation from AI response
function extractRecommendation(text) {
    // Look for BUY, SELL, or HOLD at the start of the text
    const match = text.match(/^(BUY|SELL|HOLD)/i);
    if (match) {
        return match[0].toUpperCase();
    }
    
    // If not at the start, look for it in the text with "Recommendation:" prefix
    const recMatch = text.match(/Recommendation:\s*(BUY|SELL|HOLD)/i);
    if (recMatch) {
        return recMatch[1].toUpperCase();
    }
    
    // Default to "HOLD" if no clear recommendation found
    return "HOLD";
}

// Endpoint to get AI analysis
app.post("/analyze", async (req, res) => {
    try {
        const { stockData } = req.body;
        const result = stockData.chart.result[0];
        const prices = result.indicators.quote[0].close;
        const currentPrice = prices[prices.length - 1];
        const startPrice = prices[0];
        const priceChange = ((currentPrice - startPrice) / startPrice) * 100;
        
        const prompt = `
            You are a stock market expert. Analyze this stock data and provide your recommendation.
            
            IMPORTANT: Your response MUST start with either "BUY", "SELL", or "HOLD" in capital letters,
            followed by a clear explanation of your recommendation.
            
            Current price: $${currentPrice.toFixed(2)}
            Price change: ${priceChange.toFixed(2)}%
            
            Consider these factors in your analysis:
            1. Recent price trends
            2. Volatility patterns
            3. Price momentum
            4. Overall market conditions
            
            Format your response like this:
            [BUY/SELL/HOLD]
            [Your detailed analysis here...]
            
            Make your recommendation clear and well-justified based on the technical analysis of the data provided.
        `;

        const response = await axios.post('https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent', {
            contents: [{
                parts: [{
                    text: prompt
                }]
            }]
        }, {
            headers: {
                'Content-Type': 'application/json',
                'x-goog-api-key': process.env.GEMINI_API_KEY
            }
        });

        const analysisText = response.data.candidates[0].content.parts[0].text;
        const recommendation = extractRecommendation(analysisText);

        res.json({
            recommendation: recommendation,
            analysis: analysisText.replace(/^(BUY|SELL|HOLD)\s*/i, '') // Remove recommendation from start for cleaner display
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error getting AI analysis" });
    }
});

app.listen(3000, () => console.log("Server running on port 3000"));
