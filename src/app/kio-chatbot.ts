
import { ChangeDetectorRef, Component, ElementRef, ViewChild, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

interface Msg {
  from: 'bot' | 'user';
  text?: string;
  title?: string;
  extract?: string;
  thumb?: string;
  url?: string;
  related?: string[];
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="app">
      <header>
        <span class="logo">🤖</span>
        <div>
          <h1>Kio Chatbot 2.0</h1>
          <small>Ask me anything — I search Wikipedia for you</small>
        </div>
      </header>

      <main #scroller>
        @for (m of messages; track $index) {
          <div class="row" [class.user]="m.from === 'user'">
            <div class="bubble" [class.user]="m.from === 'user'">
              @if (m.thumb) {
                <img [src]="m.thumb" [alt]="m.title" />
              }
              @if (m.title) {
                <h3>{{ m.title }}</h3>
              }
              @if (m.text) {
                <p>{{ m.text }}</p>
              }
              @if (m.extract) {
                <p>{{ m.extract }}</p>
              }
              @if (m.url) {
                <a [href]="m.url" target="_blank" rel="noopener">Read full article →</a>
              }
              @if (m.related?.length) {
                <div class="chips">
                  <span>Related:</span>
                  @for (r of m.related; track r) {
                    <button (click)="ask(r)">{{ r }}</button>
                  }
                </div>
              }
            </div>
          </div>
        }
        @if (loading) {
          <div class="row"><div class="bubble typing">Kio is typing…</div></div>
        }
      </main>

      <footer>
        <input
          [(ngModel)]="query"
          (keyup.enter)="ask()"
          placeholder="Type a topic, e.g. Albert Einstein"
          [disabled]="loading"
        />
        <button (click)="ask()" [disabled]="loading || !query.trim()">Send</button>
      </footer>
    </div>
  `,
  styles: [`
    :host { display:block; font-family: 'Segoe UI', system-ui, sans-serif; }
    .app { max-width:720px; height:100vh; margin:0 auto; display:flex; flex-direction:column; background:#f4f6fb; }
    header { display:flex; gap:12px; align-items:center; padding:14px 18px; background:#4f46e5; color:#fff; }
    header h1 { margin:0; font-size:20px; }
    header small { opacity:.85; }
    .logo { font-size:30px; }
    main { flex:1; overflow-y:auto; padding:16px; }
    .row { display:flex; margin-bottom:12px; }
    .row.user { justify-content:flex-end; }
    .bubble { max-width:82%; padding:12px 14px; border-radius:14px; background:#fff; box-shadow:0 1px 3px rgba(0,0,0,.1); }
    .bubble.user { background:#4f46e5; color:#fff; }
    .bubble h3 { margin:0 0 6px; }
    .bubble p { margin:0 0 8px; line-height:1.5; }
    .bubble img { max-width:100%; max-height:200px; border-radius:10px; margin-bottom:8px; }
    .bubble a { color:#4f46e5; font-weight:600; text-decoration:none; }
    .typing { font-style:italic; color:#666; }
    .chips { margin-top:10px; display:flex; flex-wrap:wrap; gap:6px; align-items:center; }
    .chips span { font-size:12px; color:#666; }
    .chips button { border:1px solid #4f46e5; background:#fff; color:#4f46e5; border-radius:16px; padding:4px 10px; cursor:pointer; font-size:12px; }
    .chips button:hover { background:#4f46e5; color:#fff; }
    footer { display:flex; gap:8px; padding:12px; background:#fff; border-top:1px solid #ddd; }
    footer input { flex:1; padding:12px; border:1px solid #ccc; border-radius:24px; outline:none; font-size:15px; }
    footer input:focus { border-color:#4f46e5; }
    footer button { padding:0 22px; border:none; border-radius:24px; background:#4f46e5; color:#fff; font-weight:600; cursor:pointer; }
    footer button:disabled { opacity:.5; cursor:not-allowed; }
  `],
})
export class KioChatbot {
  private http = inject(HttpClient);
  private cdr = inject(ChangeDetectorRef);
  @ViewChild('scroller') scroller!: ElementRef<HTMLElement>;

  query = '';
  loading = false;
  messages: Msg[] = [
    { from: 'bot', text: "Hi! I'm Kio 👋 Tell me any topic and I'll fetch it from Wikipedia." },
  ];

  ask(topic?: string) {
    const q = (topic ?? this.query).trim();
    if (!q) return;

    this.messages.push({ from: 'user', text: q });
    this.query = '';
    this.loading = true;
    this.scrollDown();

    this.http
      .get<any>('https://en.wikipedia.org/w/api.php', {
        params: {
          action: 'query',
          list: 'search',
          srsearch: q,
          srlimit: '5',
          format: 'json',
          origin: '*',
        },
      })
      .subscribe({
        next: (res) => {
          const results: any[] = res?.query?.search ?? [];
          if (!results.length) {
            this.botSay({ from: 'bot', text: `Sorry, "${q}" ke liye kuch nahi mila. Doosra keyword try karo.` });
            return;
          }
          const best = results[0].title;
          const related = results.slice(1, 4).map((r) => r.title);
          this.fetchSummary(best, related);
        },
        error: () => this.botSay({ from: 'bot', text: 'Network error aaya. Please dobara try karo.' }),
      });
  }

  private fetchSummary(title: string, related: string[]) {
    this.http
      .get<any>(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`)
      .subscribe({
        next: (s) =>
          this.botSay({
            from: 'bot',
            title: s.title,
            extract: s.extract,
            thumb: s.thumbnail?.source,
            url: s.content_urls?.desktop?.page,
            related,
          }),
        error: () => this.botSay({ from: 'bot', text: 'Summary load nahi ho paayi.' }),
      });
  }

  private botSay(msg: Msg) {
  this.messages.push(msg);
  this.loading = false;
  this.cdr.detectChanges();
  this.scrollDown();
}

  private scrollDown() {
    setTimeout(() => {
      const el = this.scroller?.nativeElement;
      if (el) el.scrollTop = el.scrollHeight;
    }, 50);
  }
}