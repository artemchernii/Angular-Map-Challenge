import { Component, OnDestroy, OnInit } from '@angular/core';
import * as L from 'leaflet';
import 'leaflet-routing-machine';
import { Subscription } from 'rxjs';
import { Station } from 'src/app/models/station';
import { MapService } from 'src/app/services/map.service';
import { FactoryIcons } from 'src/app/models/FactoryIcons';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-map',
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.scss'],
})
export class MapComponent implements OnInit, OnDestroy {
  private routeInstructions: { lat: number; lng: number }[] = [];
  private stationsSubs?: Subscription;
  private stations: Station[] = [];
  private map: any | undefined;
  private waypoints = [
    L.latLng(38.736, -9.142685),
    L.latLng(37.2315124677415, -8.628306144673907),
  ];
  private markers: any[] = [];
  public spinnerHidden = false;
  public distanceToStation = 2;
  public selectedChargersStatus = 2;

  constructor(private mapService: MapService, private _snackBar: MatSnackBar) {}

  ngOnInit(): void {
    this.stationsSubs = new Subscription();
    this.stationsSubs.add(
      this.mapService.getStations().subscribe(
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
      )
    );
    this.initMap();
  }
  ngOnDestroy(): void {
    /**
     *  Unsubscribe from observables and remove map
     */
    this.stationsSubs?.unsubscribe();
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
      'https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png??api_key=a2e59569-47d5-4b93-b767-148311eec2ca',
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
    if (this.stations) {
      for (let i = 0; i < this.stations.length; i++) {
        if (chargersOption === 1) {
          this.addStationsMarkers(i, distanceToStation);
        }
        if (chargersOption === 2) {
          if (this.stations[i].socket_type.indexOf('Rápido') !== -1) {
            this.addStationsMarkers(i, distanceToStation);
          }
        }
      }
    }
  }
  /**
   *  Add markers to the map for fast chargers or regular chargers
   * @param distanceToStation - distance to closest stations
   * @param index - index of one particular station
   */
  private addStationsMarkers(index: number, distanceToStation: number) {
    for (const instruction of this.routeInstructions) {
      const stationLatLng = {
        lat: this.stations[index].latitude,
        lon: this.stations[index].longitude,
      };
      if (
        this.mapService.getDistanceBetweenTwoPoints(stationLatLng, {
          lat: instruction.lat,
          lon: instruction.lng,
        }) < distanceToStation
      ) {
        const marker = new (L.marker as any)(
          [this.stations[index].latitude, this.stations[index].longitude],
          {
            icon:
              this.stations[index].socket_type.indexOf('Rápido') !== -1
                ? FactoryIcons.stationIcon()
                : FactoryIcons.hiddenStation(),
          }
        )
          .bindPopup(
            `Address: ${this.stations[index].address} <br />Location:${this.stations[index].localization}<br />Socked type: ${this.stations[index].socket_type} <br/> Socket number: ${this.stations[index].socket_number}`
          )
          .addTo(this.map);
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
      for (const mark of this.markers) {
        this.map.removeLayer(mark);
      }
      this.markers = [];
    }
  }

  /**
   *  Submiting distance option to render closest stations (works for both regular and fast)
   */
  public submitDistanceChange(): void {
    this.clearMapLayer();
    this.addStationsToMap(this.distanceToStation, this.selectedChargersStatus);
    this._snackBar.open(`Distance ${this.distanceToStation}`, 'Success', {
      horizontalPosition: 'center',
      verticalPosition: 'bottom',
    });
  }
  /**
   *  Change handler for fast chargers option or all chargers
   */
  public chargesChange(): void {
    this.clearMapLayer();
    this.addStationsToMap(this.distanceToStation, this.selectedChargersStatus);
  }
}
