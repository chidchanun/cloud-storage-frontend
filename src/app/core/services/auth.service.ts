import {
    inject,
    Injectable,
    signal,
} from '@angular/core';

import { HttpClient } from '@angular/common/http';

import {
    catchError,
    map,
    Observable,
    of,
    tap,
} from 'rxjs';

import { environment } from '../../../environments/environment';

interface ApiUser {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
    email_verified: boolean;
    picture_path: string | null;
    phone: string;
}

interface ApiAuthResponse {
    message: string;
    user: ApiUser;
}

export interface User {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    emailVerified: boolean;
    picturePath: string | null;
    phoneNumber: string;
}

export interface RegisterRequest {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    phoneNumber: string;
}

export interface RegisterResponse {
    message: string;
    user: User;
}

export interface LoginRequest {
    email: string;
    password: string;
}

export interface LoginResponse {
    message: string;
    user: User;
}

@Injectable({
    providedIn: 'root',
})
export class AuthService {
    private readonly http = inject(HttpClient);
    private readonly apiUrl = `${environment.apiUrl}/auth`;
    private readonly baseApiUrl = environment.apiUrl;

    readonly currentUser = signal<User | null>(null);
    readonly authChecked = signal(false);

    register(data: RegisterRequest): Observable<RegisterResponse> {
        return this.http
            .post<ApiAuthResponse>(
                `${this.apiUrl}/register`,
                {
                    first_name: data.firstName,
                    last_name: data.lastName,
                    email: data.email,
                    password: data.password,
                    phone: data.phoneNumber,
                },
                { withCredentials: true },
            )
            .pipe(
                map((response) => this.normalizeAuthResponse(response)),
                tap((response) => {
                    this.currentUser.set(response.user);
                    this.authChecked.set(true);
                }),
            );
    }

    login(data: LoginRequest): Observable<LoginResponse> {
        return this.http
            .post<ApiAuthResponse>(
                `${this.apiUrl}/login`,
                data,
                { withCredentials: true },
            )
            .pipe(
                map((response) => this.normalizeAuthResponse(response)),
                tap((response) => {
                    this.currentUser.set(response.user);
                    this.authChecked.set(true);
                }),
            );
    }

    getGoogleLoginUrl(): string {
        return `${this.apiUrl}/google`;
    }

    uploadProfilePicture(file: File): Observable<RegisterResponse> {
        const formData = new FormData();
        formData.append('file', file);

        return this.http
            .post<ApiAuthResponse>(
                `${this.baseApiUrl}/me/profile-picture`,
                formData,
                { withCredentials: true },
            )
            .pipe(
                map((response) => this.normalizeAuthResponse(response)),
                tap((response) => {
                    this.currentUser.set(response.user);
                    this.authChecked.set(true);
                }),
            );
    }

    loadCurrentUser(): Observable<User | null> {
        return this.http
            .get<ApiUser>(
                `${this.baseApiUrl}/me`,
                { withCredentials: true },
            )
            .pipe(
                map((user) => this.normalizeUser(user)),
                tap((user) => {
                    this.currentUser.set(user);
                    this.authChecked.set(true);
                }),
                catchError(() => {
                    this.currentUser.set(null);
                    this.authChecked.set(true);
                    return of(null);
                }),
            );
    }

    loadCurrentUserStrict(): Observable<User> {
        return this.http
            .get<ApiUser>(
                `${this.baseApiUrl}/me`,
                { withCredentials: true },
            )
            .pipe(
                map((user) => this.normalizeUser(user)),
                tap((user) => {
                    this.currentUser.set(user);
                    this.authChecked.set(true);
                }),
            );
    }

    logout(): Observable<void> {
        return this.http
            .post<void>(
                `${this.apiUrl}/logout`,
                {},
                { withCredentials: true },
            )
            .pipe(
                tap(() => {
                    this.currentUser.set(null);
                    this.authChecked.set(true);
                }),
            );
    }

    isAuthenticated(): boolean {
        return this.currentUser() !== null;
    }

    private normalizeAuthResponse(response: ApiAuthResponse): RegisterResponse {
        return {
            message: response.message,
            user: this.normalizeUser(response.user),
        };
    }

    private normalizeUser(user: ApiUser): User {
        return {
            id: user.id,
            firstName: user.first_name,
            lastName: user.last_name,
            email: user.email,
            emailVerified: user.email_verified,
            picturePath: user.picture_path,
            phoneNumber: user.phone,
        };
    }
}
