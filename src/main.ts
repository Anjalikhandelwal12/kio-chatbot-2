import { bootstrapApplication } from '@angular/platform-browser';
import { provideHttpClient } from '@angular/common/http';
import { KioChatbot } from './app/kio-chatbot';

bootstrapApplication(KioChatbot, {
  providers: [provideHttpClient()],
}).catch((err) => console.error(err));