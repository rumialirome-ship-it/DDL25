import { GoogleGenAI, Type } from "@google/genai";
import { Draw, Bet, Client, SmartAnalysisReport, SmartInterimReport, DrawStatus } from '../types/index.ts';
import { isBetWinner } from '../utils/helpers.ts';

const API_KEY = process.env.API_KEY;
let ai: GoogleGenAI | null = null;

if (API_KEY) {
    ai = new GoogleGenAI({ apiKey: API_KEY });
} else {
    // This message will be visible in the developer console.
    console.error("Gemini API Key is missing. AI-powered analysis will be disabled. Please provide the API_KEY environment variable during the build process.");
}

const finalAnalysisSchema = {
  type: Type.OBJECT,
  properties: {
    headline: { type: Type.STRING, description: 'A brief, catchy headline summarizing the draw result. Max 15 words.' },
    netProfitAnalysis: { type: Type.STRING, description: 'A short sentence analyzing the net profit or loss figure. Example: "The company secured a healthy profit from this draw."' },
    performanceAnalysis: { type: Type.STRING, description: 'Analysis of the draw\'s performance, considering participation levels (number of bets). Example: "Participation was moderate, indicating steady player engagement."' },
    conclusion: { type: Type.STRING, description: 'A concluding remark or a forecast for future draws. Example: "Overall, a successful draw. Future promotions could boost participation further."' }
  },
  required: ['headline', 'netProfitAnalysis', 'performanceAnalysis', 'conclusion']
};

const interimAnalysisSchema = {
  type: Type.OBJECT,
  properties: {
    headline: { type: Type.STRING, description: 'A brief, catchy headline summarizing the current betting landscape for the draw. Max 15 words.' },
    riskAnalysis: { type: Type.STRING, description: 'A short sentence analyzing the financial risk based on heavily-betted numbers. Example: "Significant liability on number 1234; a win on this could lead to a large payout."' },
    participationAnalysis: { type: Type.STRING, description: 'Analysis of the draw\'s participation levels (number of bets). Example: "High participation with a wide spread of bets suggests strong player engagement."' },
    conclusion: { type: Type.STRING, description: 'A concluding remark about the betting trends. Example: "Betting is concentrated on lower-order numbers. Monitor results closely."' }
  },
  required: ['headline', 'riskAnalysis', 'participationAnalysis', 'conclusion']
};

export const getSmartAnalysis = async (data: { draw: Draw; bets: Bet[]; clients: Client[] }): Promise<SmartAnalysisReport | SmartInterimReport | string> => {
    // If the API key was not provided, return an informative message to be displayed in the UI.
    if (!ai) {
        return "AI analysis is disabled. The Google Gemini API key was not provided during the application build.";
    }
    
    const { draw, bets, clients } = data;

    if (draw.status === DrawStatus.Finished) {
        const totalStake = bets.reduce((sum, bet) => sum + bet.stake, 0);
        const winningBets = bets.filter(bet => isBetWinner(bet, draw.winningNumbers));

        const clientMap = new Map(clients.map(c => [c.id, c]));
        const totalPayout = winningBets.reduce((sum, bet) => {
            const client = clientMap.get(bet.clientId);
            if (!client || !client.prizeRates) return sum;

            const conditionKey = bet.condition.toLowerCase() as 'first' | 'second';
            const gamePrizeRates = client.prizeRates[bet.gameType as keyof typeof client.prizeRates];

            if (gamePrizeRates && typeof gamePrizeRates[conditionKey] === 'number') {
                const rate = gamePrizeRates[conditionKey];
                const winnings = bet.stake * (rate / 100);
                return sum + winnings;
            }

            return sum;
        }, 0);
        
        const netProfit = totalStake - totalPayout;

        const prompt = `
            Analyze the following lottery draw data and provide a summary in the requested JSON format.
            Data for your analysis:
            - Draw Name: Draw ${draw.name}
            - Winning Numbers: ${draw.winningNumbers?.join(', ')}
            - Total Bets Placed: ${bets.length}
            - Total Stake Collected: ${totalStake.toFixed(2)}
            - Net Profit for the Company: ${netProfit.toFixed(2)}
        `;

        try {
            const response = await ai.models.generateContent({ 
                model: 'gemini-2.5-flash', 
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: finalAnalysisSchema
                }
            });
            // FIX: Add a check for response.text to prevent a crash if the API returns an empty response.
            const jsonText = response.text?.trim();
            if (!jsonText) {
                console.error("Received empty or undefined response from Gemini API for final analysis.");
                return "The AI model returned an empty response. Please try again.";
            }
            return JSON.parse(jsonText) as SmartAnalysisReport;
        } catch (error) {
            console.error("Error generating final analysis with Gemini API:", error);
            return "An error occurred while generating the final report. The AI model may be temporarily unavailable or the response was not valid. Please try again.";
        }
    } else if (draw.status === DrawStatus.Closed) {
        const totalStake = bets.reduce((sum, bet) => sum + bet.stake, 0);
        
        const stakeByNumber = new Map<string, number>();
        bets.forEach(bet => {
            stakeByNumber.set(bet.number, (stakeByNumber.get(bet.number) || 0) + bet.stake);
        });
        const topNumbers = [...stakeByNumber.entries()]
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([number, stake]) => `${number} (Stake: ${stake.toFixed(2)})`)
            .join(', ');

        const prompt = `
            Analyze the following live lottery draw data for a draw that has closed for betting but has not yet had winning numbers announced. Provide a summary in the requested JSON format. Focus on financial risk exposure and betting trends.
            Data for your analysis:
            - Draw Name: Draw ${draw.name}
            - Total Bets Placed: ${bets.length}
            - Total Stake Collected: ${totalStake.toFixed(2)}
            - Top 5 Highest-Staked Numbers: ${topNumbers || 'N/A'}
        `;

        try {
            const response = await ai.models.generateContent({ 
                model: 'gemini-2.5-flash', 
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: interimAnalysisSchema
                }
            });
            // FIX: Add a check for response.text to prevent a crash if the API returns an empty response.
            const jsonText = response.text?.trim();
            if (!jsonText) {
                console.error("Received empty or undefined response from Gemini API for interim analysis.");
                return "The AI model returned an empty response. Please try again.";
            }
            return JSON.parse(jsonText) as SmartInterimReport;
        } catch (error) {
            console.error("Error generating interim analysis with Gemini API:", error);
            return "An error occurred while generating the interim report. The AI model may be temporarily unavailable or the response was not valid. Please try again.";
        }
    } else {
        return "AI analysis is only available for 'CLOSED' or 'FINISHED' draws.";
    }
};