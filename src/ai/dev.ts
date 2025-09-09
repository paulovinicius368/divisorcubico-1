import { config } from 'dotenv';
config();

import '@/ai/flows/allocate-hourly-volume.ts';
import '@/services/allocation-service.ts';
