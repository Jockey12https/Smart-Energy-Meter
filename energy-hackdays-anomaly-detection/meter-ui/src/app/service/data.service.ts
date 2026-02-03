import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable()
export class DataService {

  constructor(private http: HttpClient) { }

  getData(meterId: string, from: string, to: string): Observable<any> {
    return this.http.post(environment.apiUrl + '/data', { meterId, from, to });
  }

  getAnomalies(meterId: string, from: string, to: string): Observable<any> {
    return this.http.post(environment.apiUrl + '/anomalies', { meterId, from, to });
  }

  getMeters(): Observable<string[]> {
    return this.http.get<string[]>(environment.apiUrl + '/meters');
  }

  simulate(event: any): Observable<any> {
    return this.http.post(environment.apiUrl + '/simulate', event);
  }

}
