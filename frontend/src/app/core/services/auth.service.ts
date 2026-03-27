import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { AuthResponse, GuestAuthResponse, User } from '../../shared/models';

interface StoredAuth {
  token: string;
  userId: string;
  email: string;
  displayName?: string;
  roomId?: string;
  role?: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly TOKEN_KEY = 'de_token';
  private readonly USER_KEY = 'de_user';

  private _auth = signal<StoredAuth | null>(this.loadFromStorage());

  readonly isLoggedIn = computed(() => !!this._auth());
  readonly currentUser = computed(() => this._auth());
  readonly token = computed(() => this._auth()?.token ?? null);

  constructor(private http: HttpClient, private router: Router) {}

  register(email: string, password: string, displayName?: string) {
    return this.http
      .post<AuthResponse>(`${environment.apiUrl}/auth/register`, { email, password, displayName })
      .pipe(tap((res) => this.storeAuth(res.accessToken)));
  }

  login(email: string, password: string) {
    return this.http
      .post<AuthResponse>(`${environment.apiUrl}/auth/login`, { email, password })
      .pipe(tap((res) => this.storeAuth(res.accessToken)));
  }

  guestJoin(roomId: string, displayName: string) {
    return this.http
      .post<GuestAuthResponse>(`${environment.apiUrl}/auth/rooms/${roomId}/join`, { displayName })
      .pipe(
        tap((res) => {
          this.storeAuth(res.accessToken, {
            userId: res.user.id,
            email: res.user.email,
            displayName: res.user.displayName,
            roomId: res.roomId,
            role: res.role,
          });
        }),
      );
  }

  logout() {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    this._auth.set(null);
    this.router.navigate(['/auth/login']);
  }

  private storeAuth(token: string, extra?: Partial<StoredAuth>) {
    const payload = this.parseJwt(token);
    const auth: StoredAuth = {
      token,
      userId: extra?.userId ?? payload?.sub ?? '',
      email: extra?.email ?? payload?.email ?? '',
      displayName: extra?.displayName ?? payload?.displayName,
      roomId: extra?.roomId ?? payload?.roomId,
      role: extra?.role ?? payload?.role,
    };
    localStorage.setItem(this.TOKEN_KEY, token);
    localStorage.setItem(this.USER_KEY, JSON.stringify(auth));
    this._auth.set(auth);
  }

  private loadFromStorage(): StoredAuth | null {
    try {
      const raw = localStorage.getItem(this.USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  private parseJwt(token: string): any {
    try {
      return JSON.parse(atob(token.split('.')[1]));
    } catch {
      return null;
    }
  }
}
