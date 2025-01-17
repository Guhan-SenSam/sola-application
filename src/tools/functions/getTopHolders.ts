const functionDescription = `
  This function retrieves the top holders for a token.
  
  Input Details:
  - **Token Address**: A Base58-encoded string adhering to the Solana standard.
  - **Token Symbol**: A string representing the token symbol. If the symbol is not prefixed with '$', 
    it will be automatically added before processing.
`;

export const getTopHolders = {
  type: 'function',
  name: 'getTopHolders',
  description: functionDescription.trim(),
  parameters: {
    type: 'object',
    properties: {
      tokenInput: {
        type: 'string',
        description: 'The token address (Base58-encoded) or symbol prefixed with $.',
      },
    },
    required: ['tokenInput'],
  },
};
