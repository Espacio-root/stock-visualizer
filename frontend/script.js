// Initialize global variables
let chart
let currentStockData

// Function to update chart
function updateChart(symbol, data) {
    if (chart) {
        chart.destroy()
    }

    const ctx = document.getElementById('priceChart').getContext('2d')

    chart = new Chart(ctx, {
        type: 'line',
        data: {
            datasets: [
                {
                    label: `${symbol} Price Trend`,
                    data: data,
                    borderColor: '#2563eb',
                    backgroundColor: 'rgba(37, 99, 235, 0.1)',
                    fill: true,
                    tension: 0.4,
                },
            ],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false,
                },
            },
            scales: {
                x: {
                    type: 'category',
                    grid: {
                        display: false,
                    },
                },
                y: {
                    grid: {
                        color: 'rgba(0, 0, 0, 0.1)',
                    },
                },
            },
        },
    })
}

// Update the getAIAnalysis function in your frontend script:
async function getAIAnalysis(stockData) {
    try {
        const analysisSection = document.getElementById('analysisSection')
        const analysisContent = document.getElementById('analysisContent')
        const recommendationBadge = document.getElementById('recommendationBadge')

        analysisContent.innerHTML = 'Getting AI analysis...'
        analysisSection.style.display = 'block'

        const response = await fetch('https://stock-visualizer-7ycf.onrender.com/analyze', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ stockData }),
        })

        const data = await response.json()

        // Extract recommendation - look for the word in caps between asterisks or after "Recommendation:"
        let recommendation = '' // default
        const recMatch = data.analysis.match(
            /\*\*(BUY|SELL|HOLD)\*\*|Recommendation:\s*(BUY|SELL|HOLD)/i,
        )
        if (recMatch) {
            recommendation = (recMatch[1] || recMatch[2]).toUpperCase()
        }

        // Update recommendation badge
        recommendationBadge.textContent = recommendation
        recommendationBadge.className = `recommendation ${recommendation}`

        // Clean up and display the analysis text
        let analysisText = data.analysis
            .replace(/\*\*(BUY|SELL|HOLD)\*\*/i, '') // Remove **RECOMMENDATION**
            .replace(/Recommendation:\s*(BUY|SELL|HOLD)/i, '') // Remove "Recommendation: RECOMMENDATION"
            .replace(/Analysis:/i, '') // Remove "Analysis:" prefix
            .trim()

        analysisContent.innerHTML = analysisText
    } catch (error) {
        console.error('Error getting AI analysis:', error)
        analysisContent.innerHTML = 'Error getting AI analysis. Please try again.'
    }
}

// Main function to fetch stock data
async function fetchStockData() {
    const symbol = document.getElementById('stockSymbol').value.toUpperCase()
    const errorDiv = document.getElementById('error')
    const stockInfo = document.getElementById('stockInfo')
    const analysisSection = document.getElementById('analysisSection')

    if (!symbol) {
        errorDiv.textContent = 'Please enter a stock symbol'
        return
    }

    try {
        errorDiv.textContent = ''
        stockInfo.innerHTML = '<div class="loading">Loading stock data...</div>'
        analysisSection.style.display = 'none'

        const response = await fetch(`https://stock-visualizer-7ycf.onrender.com/stock/${symbol}`)
        const data = await response.json()

        if (data.chart.error) {
            throw new Error('Invalid stock symbol')
        }

        currentStockData = data
        const result = data.chart.result[0]
        const timestamps = result.timestamp
        const quotes = result.indicators.quote[0]
        const prices = quotes.close

        // Display current stock info
        const currentPrice = prices[prices.length - 1].toFixed(2)
        const priceChange = (prices[prices.length - 1] - prices[0]).toFixed(2)
        const priceChangePercent = ((priceChange / prices[0]) * 100).toFixed(2)
        const changeColor = priceChange >= 0 ? '#22c55e' : '#ef4444'

        stockInfo.innerHTML = `
                    <h2>${symbol}</h2>
                    <div class="price">$${currentPrice}</div>
                    <div style="color: ${changeColor}">
                        ${priceChange >= 0 ? '▲' : '▼'} $${Math.abs(priceChange)} (${priceChangePercent}%)
                    </div>
                `

        // Create price trend data
        const chartData = timestamps
            .map((time, index) => ({
                x: new Date(time * 1000).toLocaleDateString(),
                y: prices[index],
            }))
            .filter((item) => item.y !== null)

        updateChart(symbol, chartData)
        await getAIAnalysis(data)
    } catch (error) {
        errorDiv.textContent =
            'Error fetching stock data. Please check the symbol and try again.'
        stockInfo.textContent = ''
        if (chart) {
            chart.destroy()
            chart = null
        }
    }
}

// Add event listeners after all functions are defined
document.addEventListener('DOMContentLoaded', function() {
    // Add click event listener to the button
    document
        .getElementById('analyzeButton')
        .addEventListener('click', fetchStockData)

    // Add enter key event listener to the input
    document
        .getElementById('stockSymbol')
        .addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                fetchStockData()
            }
        })
})
