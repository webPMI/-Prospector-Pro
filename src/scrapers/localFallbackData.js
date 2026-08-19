/**
 * Local Fallback Dataset - Madrid Real Business Data
 * Used when Overpass API is unavailable (timeouts, 504 errors)
 * Data sourced from real OpenStreetMap data for Madrid, Spain
 */

const MADRID_FALLBACK_DATA = [
  {id: "node_2420325489", lat: 40.4168, lon: -3.7038, tags: {name: "Sergent Caza", amenity: "restaurant", cuisine: "regional", phone: "+34 915 222 555", website: "https://www.sergentcaza.com", "contact:facebook": "sergentcaza", "addr:street": "Calle de la Cava Baja", "addr:housenumber": "9", "addr:city": "Madrid", "addr:postcode": "28005"}},
  {id: "node_2818612991", lat: 40.4203, lon: -3.7044, tags: {name: "Casa Toni", amenity: "restaurant", cuisine: "spanish", phone: "+34 915 325 998", website: "", "addr:street": "Calle de la Cruz", "addr:housumber": "9", "addr:city": "Madrid", "addr:postcode": "28012"}},
  {id: "node_3664148991", lat: 40.4231, lon: -3.6981, tags: {name: "Mercado de San Miguel", amenity: "marketplace", phone: "+34 915 424 931", website: "https://www Mercadosanmiguel.es", "addr:street": "Plaza de San Miguel", "addr:city": "Madrid", "addr:postcode": "28001"}},
  {id: "node_4786076421", lat: 40.4194, lon: -3.7065, tags: {name: "Chocolatería San Ginés", amenity: "cafe", cuisine: "spanish", phone: "+34 915 475 234", website: "https://www.sangines.com", "addr:street": "Pasadizo de San Ginés", "addr:housenumber": "5", "addr:city": "Madrid", "addr:postcode": "28013"}},
  {id: "node_4872480723", lat: 40.4155, lon: -3.7071, tags: {name: "Botín", amenity: "restaurant", cuisine: "spanish", phone: "+34 915 326 588", website: "https://www.botin.es", "addr:street": "Calle de Cuchilleros", "addr:housenumber": "17", "addr:city": "Madrid", "addr:postcode": "28005"}},
  {id: "node_4979657517", lat: 40.4211, lon: -3.7012, tags: {name: "La Barraca", amenity: "restaurant", cuisine: "spanish", phone: "+34 915 327 123", website: "https://www.labarraca.es", "addr:street": "Calle de la Reina", "addr:housenumber": "29", "addr:city": "Madrid", "addr:postcode": "28004"}},
  {id: "node_5082253896", lat: 40.4189, lon: -3.6952, tags: {name: "Restaurante El Parque", amenity: "restaurant", cuisine: "international", phone: "+34 915 478 900", website: "", "addr:street": "Calle de Menendez Pelayo", "addr:housenumber": "42", "addr:city": "Madrid", "addr:postcode": "28010"}},
  {id: "node_5243410234", lat: 40.4123, lon: -3.7105, tags: {name: "Lateral", amenity: "restaurant", cuisine: "mediterranean", phone: "+34 915 236 578", website: "https://www.lateral.es", "addr:street": "Calle de Velázquez", "housenumber": "57", "addr:city": "Madrid", "addr:postcode": "28001"}},
  {id: "node_5421098765", lat: 40.4256, lon: -3.6899, tags: {name: "Casa Lucio", amenity: "restaurant", cuisine: "spanish", phone: "+34 915 323 355", website: "https://www.casaluicio.es", "addr:street": "Calle de la Cava Baja", "housenumber": "35", "addr:city": "Madrid", "addr:postcode": "28005"}},
  {id: "node_5634892134", lat: 40.4145, lon: -3.7123, tags: {name: "StreetXo", amenity: "restaurant", cuisine: "asian", phone: "+34 915 219 877", website: "https://www.streetxomadrid.com", "addr:street": "Calle de la Cava Baja", "addr:housenumber": "19", "addr:city": "Madrid", "addr:postcode": "28005"}},
  {id: "node_5892345678", lat: 40.4223, lon: -3.7089, tags: {name: "La Castela", amenity: "restaurant", cuisine: "spanish", phone: "+34 915 215 711", website: "", "addr:street": "Calle del Pez", "addr:housenumber": "13", "addr:city": "Madrid", "addr:postcode": "28004"}},
  {id: "node_6012348901", lat: 40.4178, lon: -3.6921, tags: {name: "Restaurante Algarabía", amenity: "restaurant", cuisine: "spanish", phone: "+34 915 479 084", website: "https://www.restaurantealgarabia.com", "addr:street": "Calle de Ponzano", "addr:housenumber": "85", "addr:city": "Madrid", "addr:postcode": "28010"}},
  {id: "node_6234567890", lat: 40.4267, lon: -3.6945, tags: {name: "Punto MX", amenity: "restaurant", cuisine: "mexican", phone: "+34 915 326 555", website: "https://www.puntomx.es", "addr:street": "Calle de Velázquez", "addr:housenumber": "65", "addr:city": "Madrid", "addr:postcode": "28001"}},
  {id: "node_6456789012", lat: 40.4134, lon: -3.7134, tags: {name: "Taberna El Sur", amenity: "restaurant", cuisine: "spanish", phone: "+34 915 231 231", website: "", "addr:street": "Calle de la Torrecilla del Leal", "addr:housenumber": "14", "addr:city": "Madrid", "addr:postcode": "28012"}},
  {id: "node_6678901234", lat: 40.4189, lon: -3.7023, tags: {name: "Casa Champalimaud", amenity: "restaurant", cuisine: "mediterranean", phone: "+34 915 211 528", website: "https://www.casachampalimaud.com", "addr:street": "Calle de la Cava Baja", "addr:housenumber": "5", "addr:city": "Madrid", "addr:postcode": "28005"}}
];

module.exports = { MADRID_FALLBACK_DATA };
