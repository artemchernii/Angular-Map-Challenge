declare let L: any; // Import Leaflet

export class FactoryIcons {
  public static stationIcon(): LeafletIcon {
    return L.icon({
      iconUrl: 'assets/bolt.png',
      iconSize: [20, 20],
      iconAnchor: [12, 37],
      popupAnchor: [1, -34],
    });
  }
  public static hiddenStation(): LeafletIcon {
    return L.icon({
      iconUrl: 'assets/regular.png',
      iconSize: [13, 13],
      iconAnchor: [6, 35],
      popupAnchor: [1, -34],
    });
  }
  public static redIcon(): LeafletIcon {
    return L.icon({
      iconUrl: 'assets/start.png',
      iconSize: [38, 38],
      iconAnchor: [17, 41],
      popupAnchor: [1, -34],
    });
  }
  public static finishIcon(): LeafletIcon {
    return L.icon({
      iconUrl: 'assets/flag.png',
      iconSize: [30, 30],
      iconAnchor: [14, 36],
      popupAnchor: [1, -34],
    });
  }
}

export class LeafletIcon {} // Wrapper Pointer Class
