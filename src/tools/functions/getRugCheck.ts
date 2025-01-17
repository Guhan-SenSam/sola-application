const functionDescription = `
  Determines if a token is a rug pull or scam based on the provided name or address.
  Use this function when the user asks about risks or safety concerns related to a token.
  The user can provide input as either:
  - A token address (Base58-encoded string, following the Solana standard), or
  - A token symbol (string). If the user does not explicitly prefix the symbol with '$', 
    ensure to add it before processing.
`;

export const getRugCheck = {
  type: 'function',
  name: 'getRugCheck',
  description: functionDescription,
  parameters: {
    type: 'object',
    properties: {
      isBase58: {
        type: 'boolean',
        description: 'Indicates whether the provided input is a Base58-encoded string.',
      },
      tokenInput: {
        type: 'string',
        description: 'The name or address of the token to analyze.',
      },
    },
    required: ['isBase58','tokenInput'],
  },
};

//TODO: Shift the trigger logic here from conversation.tsx
export function getRugCheckFunction() {}
