import { Component, OnDestroy, OnInit } from '@angular/core';
import * as L from 'leaflet';
import 'leaflet-routing-machine';
import { Subject } from 'rxjs';
import { Station } from 'src/app/models/station.model';
import { MapService } from 'src/app/services/map.service';
import { FactoryIcons } from 'src/app/models/FactoryIcons';
import { MatSnackBar } from '@angular/material/snack-bar';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-map',
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.scss'],
})
export class MapComponent implements OnInit, OnDestroy {
  public spinnerHidden = false;
  public distanceToStation = 5;
  public selectedChargersStatus = 2;

  private map: any | undefined;
  private routeInstructions: { lat: number; lng: number }[] = [];
  private stations: Station[] = [];
  private markers: any[] = [];
  private waypoints = [
    L.latLng(38.736, -9.142685),
    L.latLng(37.2315124677415, -8.628306144673907),
  ];
  private onDestroy$ = new Subject<void>();
  private stadiaAPI = 'a2e59569-47d5-4b93-b767-148311eec2ca';

  constructor(private mapService: MapService, private _snackBar: MatSnackBar) {}

  ngOnInit(): void {
    this.mapService
      .getStations()
      .pipe(takeUntil(this.onDestroy$))
      .subscribe(
        (stations) => {
          this.stations = stations;
        },
        (error: Error) => {
          console.error(error);
        },
        // When we recieve our stations from API then we add them to template
        () => {
          /**
           *  Add stations along the way(route) with parameter
           * @param distanceToStation - distance from the route to closes station in KMs
           */
          this.addStationsToMap(
            this.distanceToStation,
            this.selectedChargersStatus
          );
          this.spinnerHidden = true;
        }
      );
    this.initMap();
  }
  ngOnDestroy(): void {
    /**
     *  Unsubscribe from observables and remove map
     */
    this.onDestroy$.next();
    this.onDestroy$.complete();
    if (this.map && this.map.remove) {
      this.map.off();
      this.map.remove();
    }
  }

  async initMap() {
    /**
     *  Initilize the map with view and zoom
     */
    this.map = L.map('map').setView([38.736, -9.142685], 14);
    /**
     *  Add stadia tiles to the map
     */
    const tiles = L.tileLayer(
      `https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png??api_key=${this.stadiaAPI}`,
      {
        minZoom: 3,
        maxZoom: 18,
      }
    ).addTo(this.map);
    /**
     *  Add route and waypoints with custom Icons
     */
    const controls = L.Routing.control({
      waypoints: this.waypoints,
      routeWhileDragging: false,
      lineOptions: {
        styles: [{ color: '#F44336', opacity: 1, weight: 5 }],
        addWaypoints: false,
        extendToWaypoints: true,
        missingRouteTolerance: 1,
      },
      plan: L.Routing.plan(this.waypoints, {
        draggableWaypoints: false,
        createMarker: function (i: number, waypoint: any, n: number) {
          const marker = (L.marker as any)(waypoint.latLng, {
            draggable: false,
            // Add custom icons for start and finish waypoints
            icon: i === 0 ? FactoryIcons.redIcon() : FactoryIcons.finishIcon(),
          });
          // Bind popup add description for start | finish waypoints
          return marker
            .bindPopup(
              i === 0
                ? 'Lisbon Airport ✈️<br/>Starting point where Lewis Hamilton 🚀 and his team start their journey.'
                : 'Autódromo Internacional do Algarve <br/>Finish😀🏎'
            )
            .openPopup();
        },
      }),
    }).addTo(this.map);
    /**
     *  Hide Leaflet controls panel (which is not necessary for project layout)
     */
    controls.hide();
    /**
     *  Get instructions from the route to understand where add an electric stations along the way
     */
    controls.on('routeselected', (e) => {
      // gpxRoute is about the coordinates of the crossings, taken from the cue sheet (instructions)
      let gpxRoute: any[] = [];
      e.route.instructions.forEach(function (instruction: any) {
        gpxRoute.push(e.route.coordinates[instruction.index]);
      });
      this.routeInstructions = gpxRoute;
    });
  }
  /**
   *  Add stations with markers to the map
   * @param distanceToStation - distance to closest stations
   * @param chargersOption - we have only fast chargers option and regular
   */
  private addStationsToMap(
    distanceToStation: number,
    chargersOption: number
  ): void {
    if (!this.stations || this.stations.length < 1) return;

    this.stations.forEach((station) => {
      if (chargersOption === 1) {
        this.addStationsMarkers(station, distanceToStation);
      }
      if (chargersOption === 2) {
        if (station.socket_type.indexOf('Rápido') !== -1) {
          this.addStationsMarkers(station, distanceToStation);
        }
      }
    });
  }
  /**
   *  Add markers to the map for fast chargers or regular chargers
   * @param distanceToStation - distance to closest stations
   * @param station - one particular station
   */
  private addStationsMarkers(station: Station, distanceToStation: number) {
    for (const instruction of this.routeInstructions) {
      const stationLatLng = {
        lat: station.latitude,
        lon: station.longitude,
      };
      if (
        this.mapService.getDistanceBetweenTwoPoints(stationLatLng, {
          lat: instruction.lat,
          lon: instruction.lng,
        }) < distanceToStation
      ) {
        const marker = new (L.marker as any)(
          [station.latitude, station.longitude],
          {
            icon:
              station.socket_type.indexOf('Rápido') !== -1
                ? FactoryIcons.stationIcon()
                : FactoryIcons.hiddenStation(),
          }
        )
          .bindPopup(
            `Address: ${station.address} <br />Location:${station.localization}<br />Socked type: ${station.socket_type} <br/> Socket number: ${station.socket_number}`
          )
          .addTo(this.map);
        // Add class to station marker
        L.DomUtil.addClass(marker._icon, 'station__marker');
        this.markers.push(marker);
      }
    }
  }
  /**
   *  Remove all markers from the map if they exist
   */
  private clearMapLayer(): void {
    // Clear existing markers from map
    if (this.markers.length > 0) {
      this.markers.forEach((marker) => {
        this.map.removeLayer(marker);
      });
      this.markers = [];
    }
  }

  /**
   *  Submiting distance option to render closest stations (works for both regular and fast)
   */
  public submitDistanceChange(): void {
    this.clearMapLayer();
    this.addStationsToMap(this.distanceToStation, this.selectedChargersStatus);
    this._snackBar.open(
      `${this.distanceToStation} km to closest chargers`,
      'OK',
      {
        horizontalPosition: 'center',
        verticalPosition: 'bottom',
        duration: 1000,
      }
    );
  }
  /**
   *  Change handler for fast chargers option or all chargers
   */
  public chargesChange(): void {
    this.clearMapLayer();
    this.addStationsToMap(this.distanceToStation, this.selectedChargersStatus);
  }
}
