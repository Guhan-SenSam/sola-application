const functionDescription = `
  Use this function to retrieve data about a token or obtain its basic information.
  The user can provide input as either:
  - A token address (Base58-encoded string, following the Solana standard), or
  - A token symbol (string). If the user does not explicitly prefix the symbol with '$', 
    ensure to add it before processing.
`;

export const getTokenData = {
  type: 'function',
  name: 'getTokenData',
  description: functionDescription,
  parameters: {
    type: 'object',
    strict: true,
    properties: {
      isBase58: {
        type: 'boolean',
        description: 'Indicates whether the provided input is a Base58-encoded string.',
      },
      tokenInput: {
        type: 'string',
        description: 'The token address or symbol. Prefix the symbol with "$" if not explicitly provided by the user.',
      },
    },
    required: ['isBase58', 'tokenInput'],
  },
};

//TODO: Shift the trigger logic here from conversation.tsx
export function getTokenDataFunction() {
  
}
