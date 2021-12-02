import { Injectable } from '@angular/core';
import { Station } from '../models/station.model';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Coordinate } from '../models/coordinate.model';

@Injectable({
  providedIn: 'root',
})
export class MapService {
  constructor(private http: HttpClient) {}

  /**
   * Get all Stations
   */
  public getStations(): Observable<Station[]> {
    return this.http.get<Station[]>(
      'https://tblx-daimler-trucks-and-buses.getsandbox.com/charging-stations'
    );
  }
  /**
   * Converts numeric degrees to radians
   */
  private toRad(value: number): number {
    return (value * Math.PI) / 180;
  }
  /**
   * This function takes in latitude and longitude of two location and returns the distance between them as the crow flies (in km)
   * @param cord1 - coordinates of first point (latitude/longitude)
   * @param cord2 - coordinates of second point (latitude/longitude)
   */
  getDistanceBetweenTwoPoints(cord1: Coordinate, cord2: Coordinate): number {
    if (cord1.lat == cord2.lat && cord1.lon == cord2.lon) {
      return 0;
    }

    const radlat1 = this.toRad(cord1.lat);
    const radlat2 = this.toRad(cord2.lat);

    const theta = cord1.lon - cord2.lon;
    const radtheta = this.toRad(theta);

    const notConverted =
      Math.sin(radlat1) * Math.sin(radlat2) +
      Math.cos(radlat1) * Math.cos(radlat2) * Math.cos(radtheta);

    const distance =
      ((Math.acos(notConverted > 1 ? 1 : notConverted) * 180) / Math.PI) *
      60 *
      1.1515 *
      1.609344;
    //convert miles to km

    return distance;
  }
}
