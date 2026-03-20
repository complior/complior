// AI Compliance Wrapper (EU AI Act, Art. 50.1)
import { complior } from '@complior/sdk';

export const createCompliantClient = (client: unknown) =>
  complior(client, {
    disclosure: true,
    logging: true,
    contentMarking: true,
  });
