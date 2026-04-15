import { MoodResponse } from '@vibemosphere/shared';

const testResponse: MoodResponse = {
  hexColor: "#f0f0f0",
  quote: {
    text: "Testing the atmosphere",
    author: "Lizeth",
    source: "Vibemosphere Code"
  },
  vibe: {
    label: "Cozy Coding",
    description: "Setting up the architecture"
  },
  musicSearchQuery: "Lo-fi beats for coding"
};

console.log("Architecture is working!", testResponse);