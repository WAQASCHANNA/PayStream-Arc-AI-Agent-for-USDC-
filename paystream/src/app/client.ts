import { createThirdwebClient } from "thirdweb";

// Reads the client ID from environment. If not present, export undefined
// so the UI can gracefully disable wallet connections without breaking builds.
const clientId = process.env.NEXT_PUBLIC_TEMPLATE_CLIENT_ID;

export const client = clientId
  ? createThirdwebClient({ clientId })
  : undefined;
