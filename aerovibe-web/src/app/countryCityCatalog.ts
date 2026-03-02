export type CountryCityCatalogEntry = {
  code: string
  name: string
  dialCode: string
  cities: string[]
}

export const countryCityCatalog: CountryCityCatalogEntry[] = [
  {
    code: 'AR',
    name: 'Argentina',
    dialCode: '+54',
    cities: [
      'Buenos Aires',
      'Cordoba',
      'Rosario',
      'Mendoza',
      'La Plata',
      'Mar del Plata',
      'Salta',
      'Neuquen',
      'San Miguel de Tucuman',
      'Ushuaia',
    ],
  },
  {
    code: 'BO',
    name: 'Bolivia',
    dialCode: '+591',
    cities: [
      'Santa Cruz de la Sierra',
      'La Paz',
      'Cochabamba',
      'Sucre',
      'Tarija',
      'Oruro',
      'Potosi',
      'Trinidad',
      'Montero',
      'Cobija',
    ],
  },
  {
    code: 'BR',
    name: 'Brasil',
    dialCode: '+55',
    cities: [
      'Sao Paulo',
      'Rio de Janeiro',
      'Brasilia',
      'Belo Horizonte',
      'Curitiba',
      'Porto Alegre',
      'Recife',
      'Salvador',
      'Fortaleza',
      'Florianopolis',
    ],
  },
  {
    code: 'CA',
    name: 'Canada',
    dialCode: '+1',
    cities: [
      'Toronto',
      'Montreal',
      'Vancouver',
      'Calgary',
      'Ottawa',
      'Edmonton',
      'Quebec City',
      'Winnipeg',
      'Halifax',
      'Victoria',
    ],
  },
  {
    code: 'CL',
    name: 'Chile',
    dialCode: '+56',
    cities: [
      'Santiago',
      'Valparaiso',
      'Vina del Mar',
      'Concepcion',
      'La Serena',
      'Antofagasta',
      'Temuco',
      'Puerto Montt',
      'Punta Arenas',
      'Iquique',
    ],
  },
  {
    code: 'CO',
    name: 'Colombia',
    dialCode: '+57',
    cities: [
      'Bogota',
      'Medellin',
      'Cali',
      'Barranquilla',
      'Cartagena',
      'Bucaramanga',
      'Pereira',
      'Santa Marta',
      'Manizales',
      'Cucuta',
    ],
  },
  {
    code: 'CR',
    name: 'Costa Rica',
    dialCode: '+506',
    cities: [
      'San Jose',
      'Alajuela',
      'Cartago',
      'Heredia',
      'Limon',
      'Puntarenas',
      'Liberia',
      'San Isidro',
      'Paraiso',
      'Quesada',
    ],
  },
  {
    code: 'CU',
    name: 'Cuba',
    dialCode: '+53',
    cities: [
      'La Habana',
      'Santiago de Cuba',
      'Camaguey',
      'Holguin',
      'Santa Clara',
      'Guantanamo',
      'Matanzas',
      'Pinar del Rio',
      'Cienfuegos',
      'Bayamo',
    ],
  },
  {
    code: 'DO',
    name: 'Republica Dominicana',
    dialCode: '+1',
    cities: [
      'Santo Domingo',
      'Santiago de los Caballeros',
      'San Pedro de Macoris',
      'La Romana',
      'Puerto Plata',
      'San Cristobal',
      'Moca',
      'Bani',
      'Higuey',
      'Bavaro',
    ],
  },
  {
    code: 'EC',
    name: 'Ecuador',
    dialCode: '+593',
    cities: [
      'Quito',
      'Guayaquil',
      'Cuenca',
      'Manta',
      'Ambato',
      'Loja',
      'Portoviejo',
      'Machala',
      'Santo Domingo',
      'Ibarra',
    ],
  },
  {
    code: 'SV',
    name: 'El Salvador',
    dialCode: '+503',
    cities: [
      'San Salvador',
      'Santa Ana',
      'San Miguel',
      'Soyapango',
      'Mejicanos',
      'Santa Tecla',
      'Apopa',
      'Sonsonate',
      'Usulutan',
      'Ahuachapan',
    ],
  },
  {
    code: 'ES',
    name: 'Espana',
    dialCode: '+34',
    cities: [
      'Madrid',
      'Barcelona',
      'Valencia',
      'Sevilla',
      'Malaga',
      'Bilbao',
      'Zaragoza',
      'Palma',
      'Alicante',
      'Granada',
    ],
  },
  {
    code: 'US',
    name: 'Estados Unidos',
    dialCode: '+1',
    cities: [
      'Miami',
      'New York',
      'Los Angeles',
      'Houston',
      'Chicago',
      'Orlando',
      'San Francisco',
      'Seattle',
      'Dallas',
      'Boston',
    ],
  },
  {
    code: 'FR',
    name: 'Francia',
    dialCode: '+33',
    cities: [
      'Paris',
      'Lyon',
      'Marseille',
      'Toulouse',
      'Nice',
      'Nantes',
      'Montpellier',
      'Bordeaux',
      'Lille',
      'Strasbourg',
    ],
  },
  {
    code: 'DE',
    name: 'Alemania',
    dialCode: '+49',
    cities: [
      'Berlin',
      'Hamburg',
      'Munich',
      'Cologne',
      'Frankfurt',
      'Stuttgart',
      'Dusseldorf',
      'Leipzig',
      'Dresden',
      'Bremen',
    ],
  },
  {
    code: 'GT',
    name: 'Guatemala',
    dialCode: '+502',
    cities: [
      'Ciudad de Guatemala',
      'Mixco',
      'Villa Nueva',
      'Quetzaltenango',
      'Escuintla',
      'Petapa',
      'San Juan Sacatepequez',
      'Amatitlan',
      'Chimaltenango',
      'Huehuetenango',
    ],
  },
  {
    code: 'HN',
    name: 'Honduras',
    dialCode: '+504',
    cities: [
      'Tegucigalpa',
      'San Pedro Sula',
      'La Ceiba',
      'Choloma',
      'El Progreso',
      'Comayagua',
      'Puerto Cortes',
      'Danli',
      'Juticalpa',
      'Tela',
    ],
  },
  {
    code: 'IE',
    name: 'Irlanda',
    dialCode: '+353',
    cities: [
      'Dublin',
      'Cork',
      'Limerick',
      'Galway',
      'Waterford',
      'Drogheda',
      'Swords',
      'Kilkenny',
      'Dundalk',
      'Bray',
    ],
  },
  {
    code: 'IT',
    name: 'Italia',
    dialCode: '+39',
    cities: [
      'Rome',
      'Milan',
      'Naples',
      'Turin',
      'Palermo',
      'Bologna',
      'Florence',
      'Venice',
      'Verona',
      'Genoa',
    ],
  },
  {
    code: 'JP',
    name: 'Japon',
    dialCode: '+81',
    cities: [
      'Tokyo',
      'Osaka',
      'Yokohama',
      'Nagoya',
      'Sapporo',
      'Fukuoka',
      'Kobe',
      'Kyoto',
      'Sendai',
      'Hiroshima',
    ],
  },
  {
    code: 'KR',
    name: 'Corea del Sur',
    dialCode: '+82',
    cities: [
      'Seoul',
      'Busan',
      'Incheon',
      'Daegu',
      'Daejeon',
      'Gwangju',
      'Suwon',
      'Ulsan',
      'Seongnam',
      'Changwon',
    ],
  },
  {
    code: 'MX',
    name: 'Mexico',
    dialCode: '+52',
    cities: [
      'Ciudad de Mexico',
      'Guadalajara',
      'Monterrey',
      'Puebla',
      'Tijuana',
      'Merida',
      'Leon',
      'Cancun',
      'Queretaro',
      'Aguascalientes',
    ],
  },
  {
    code: 'NI',
    name: 'Nicaragua',
    dialCode: '+505',
    cities: [
      'Managua',
      'Leon',
      'Masaya',
      'Matagalpa',
      'Chinandega',
      'Granada',
      'Esteli',
      'Bluefields',
      'Jinotega',
      'Juigalpa',
    ],
  },
  {
    code: 'NL',
    name: 'Paises Bajos',
    dialCode: '+31',
    cities: [
      'Amsterdam',
      'Rotterdam',
      'The Hague',
      'Utrecht',
      'Eindhoven',
      'Groningen',
      'Tilburg',
      'Almere',
      'Breda',
      'Nijmegen',
    ],
  },
  {
    code: 'NO',
    name: 'Noruega',
    dialCode: '+47',
    cities: [
      'Oslo',
      'Bergen',
      'Trondheim',
      'Stavanger',
      'Drammen',
      'Fredrikstad',
      'Kristiansand',
      'Tromso',
      'Sandnes',
      'Alesund',
    ],
  },
  {
    code: 'NZ',
    name: 'Nueva Zelanda',
    dialCode: '+64',
    cities: [
      'Auckland',
      'Wellington',
      'Christchurch',
      'Hamilton',
      'Tauranga',
      'Dunedin',
      'Palmerston North',
      'Napier',
      'Nelson',
      'Queenstown',
    ],
  },
  {
    code: 'PA',
    name: 'Panama',
    dialCode: '+507',
    cities: [
      'Ciudad de Panama',
      'San Miguelito',
      'Colon',
      'David',
      'Santiago',
      'Chitre',
      'Penonome',
      'La Chorrera',
      'Arraijan',
      'Bocas del Toro',
    ],
  },
  {
    code: 'PE',
    name: 'Peru',
    dialCode: '+51',
    cities: [
      'Lima',
      'Arequipa',
      'Trujillo',
      'Cusco',
      'Piura',
      'Chiclayo',
      'Iquitos',
      'Tacna',
      'Huancayo',
      'Pucallpa',
    ],
  },
  {
    code: 'PT',
    name: 'Portugal',
    dialCode: '+351',
    cities: [
      'Lisboa',
      'Porto',
      'Braga',
      'Coimbra',
      'Faro',
      'Aveiro',
      'Setubal',
      'Leiria',
      'Viseu',
      'Evora',
    ],
  },
  {
    code: 'PY',
    name: 'Paraguay',
    dialCode: '+595',
    cities: [
      'Asuncion',
      'Ciudad del Este',
      'San Lorenzo',
      'Luque',
      'Capiata',
      'Encarnacion',
      'Lambare',
      'Fernando de la Mora',
      'Pedro Juan Caballero',
      'Villarrica',
    ],
  },
  {
    code: 'SE',
    name: 'Suecia',
    dialCode: '+46',
    cities: [
      'Stockholm',
      'Gothenburg',
      'Malmo',
      'Uppsala',
      'Vasteras',
      'Orebro',
      'Linkoping',
      'Helsingborg',
      'Jonkoping',
      'Lund',
    ],
  },
  {
    code: 'UY',
    name: 'Uruguay',
    dialCode: '+598',
    cities: [
      'Montevideo',
      'Punta del Este',
      'Maldonado',
      'Salto',
      'Paysandu',
      'Rivera',
      'Colonia del Sacramento',
      'Canelones',
      'Rocha',
      'Durazno',
    ],
  },
  {
    code: 'VE',
    name: 'Venezuela',
    dialCode: '+58',
    cities: [
      'Caracas',
      'Maracaibo',
      'Valencia',
      'Barquisimeto',
      'Maracay',
      'Puerto La Cruz',
      'Maturin',
      'Merida',
      'San Cristobal',
      'Ciudad Guayana',
    ],
  },
  {
    code: 'GB',
    name: 'Reino Unido',
    dialCode: '+44',
    cities: [
      'London',
      'Manchester',
      'Birmingham',
      'Liverpool',
      'Leeds',
      'Glasgow',
      'Edinburgh',
      'Bristol',
      'Newcastle',
      'Belfast',
    ],
  },
  {
    code: 'BE',
    name: 'Belgica',
    dialCode: '+32',
    cities: [
      'Brussels',
      'Antwerp',
      'Ghent',
      'Charleroi',
      'Liege',
      'Bruges',
      'Namur',
      'Leuven',
      'Mons',
      'Mechelen',
    ],
  },
  {
    code: 'CH',
    name: 'Suiza',
    dialCode: '+41',
    cities: [
      'Zurich',
      'Geneva',
      'Basel',
      'Lausanne',
      'Bern',
      'Winterthur',
      'Lucerne',
      'St. Gallen',
      'Lugano',
      'Fribourg',
    ],
  },
  {
    code: 'AT',
    name: 'Austria',
    dialCode: '+43',
    cities: [
      'Vienna',
      'Graz',
      'Linz',
      'Salzburg',
      'Innsbruck',
      'Klagenfurt',
      'Villach',
      'Wels',
      'Sankt Polten',
      'Dornbirn',
    ],
  },
  {
    code: 'DK',
    name: 'Dinamarca',
    dialCode: '+45',
    cities: [
      'Copenhagen',
      'Aarhus',
      'Odense',
      'Aalborg',
      'Esbjerg',
      'Randers',
      'Kolding',
      'Horsens',
      'Vejle',
      'Roskilde',
    ],
  },
  {
    code: 'FI',
    name: 'Finlandia',
    dialCode: '+358',
    cities: [
      'Helsinki',
      'Espoo',
      'Tampere',
      'Vantaa',
      'Oulu',
      'Turku',
      'Jyvaskyla',
      'Kuopio',
      'Lahti',
      'Pori',
    ],
  },
  {
    code: 'AU',
    name: 'Australia',
    dialCode: '+61',
    cities: [
      'Sydney',
      'Melbourne',
      'Brisbane',
      'Perth',
      'Adelaide',
      'Canberra',
      'Gold Coast',
      'Newcastle',
      'Hobart',
      'Darwin',
    ],
  },
  {
    code: 'IN',
    name: 'India',
    dialCode: '+91',
    cities: [
      'Mumbai',
      'Delhi',
      'Bengaluru',
      'Hyderabad',
      'Chennai',
      'Kolkata',
      'Pune',
      'Ahmedabad',
      'Jaipur',
      'Surat',
    ],
  },
  {
    code: 'ZA',
    name: 'Sudafrica',
    dialCode: '+27',
    cities: [
      'Johannesburg',
      'Cape Town',
      'Durban',
      'Pretoria',
      'Port Elizabeth',
      'Bloemfontein',
      'East London',
      'Nelspruit',
      'Polokwane',
      'Kimberley',
    ],
  },
  {
    code: 'AF',
    name: 'Afganistan',
    dialCode: '+93',
    cities: [
      'Kabul',
    ],
  },
  {
    code: 'AX',
    name: 'Alandia',
    dialCode: '+35818',
    cities: [
      'Mariehamn',
    ],
  },
  {
    code: 'AL',
    name: 'Albania',
    dialCode: '+355',
    cities: [
      'Tirana',
    ],
  },
  {
    code: 'AD',
    name: 'Andorra',
    dialCode: '+376',
    cities: [
      'Andorra la Vella',
    ],
  },
  {
    code: 'AO',
    name: 'Angola',
    dialCode: '+244',
    cities: [
      'Luanda',
    ],
  },
  {
    code: 'AI',
    name: 'Anguilla',
    dialCode: '+1264',
    cities: [
      'The Valley',
    ],
  },
  {
    code: 'AG',
    name: 'Antigua y Barbuda',
    dialCode: '+1268',
    cities: [
      'Saint Johns',
    ],
  },
  {
    code: 'SA',
    name: 'Arabia Saudi',
    dialCode: '+966',
    cities: [
      'Riyadh',
    ],
  },
  {
    code: 'DZ',
    name: 'Argelia',
    dialCode: '+213',
    cities: [
      'Algiers',
    ],
  },
  {
    code: 'AM',
    name: 'Armenia',
    dialCode: '+374',
    cities: [
      'Yerevan',
    ],
  },
  {
    code: 'AW',
    name: 'Aruba',
    dialCode: '+297',
    cities: [
      'Oranjestad',
    ],
  },
  {
    code: 'AZ',
    name: 'Azerbaiyan',
    dialCode: '+994',
    cities: [
      'Baku',
    ],
  },
  {
    code: 'BS',
    name: 'Bahamas',
    dialCode: '+1242',
    cities: [
      'Nassau',
    ],
  },
  {
    code: 'BH',
    name: 'Bahrein',
    dialCode: '+973',
    cities: [
      'Manama',
    ],
  },
  {
    code: 'BD',
    name: 'Bangladesh',
    dialCode: '+880',
    cities: [
      'Dhaka',
    ],
  },
  {
    code: 'BB',
    name: 'Barbados',
    dialCode: '+1246',
    cities: [
      'Bridgetown',
    ],
  },
  {
    code: 'BZ',
    name: 'Belice',
    dialCode: '+501',
    cities: [
      'Belmopan',
    ],
  },
  {
    code: 'BJ',
    name: 'Benin',
    dialCode: '+229',
    cities: [
      'Porto-Novo',
    ],
  },
  {
    code: 'BM',
    name: 'Bermudas',
    dialCode: '+1441',
    cities: [
      'Hamilton',
    ],
  },
  {
    code: 'BY',
    name: 'Bielorrusia',
    dialCode: '+375',
    cities: [
      'Minsk',
    ],
  },
  {
    code: 'BA',
    name: 'Bosnia y Herzegovina',
    dialCode: '+387',
    cities: [
      'Sarajevo',
    ],
  },
  {
    code: 'BW',
    name: 'Botswana',
    dialCode: '+267',
    cities: [
      'Gaborone',
    ],
  },
  {
    code: 'BN',
    name: 'Brunei',
    dialCode: '+673',
    cities: [
      'Bandar Seri Begawan',
    ],
  },
  {
    code: 'BG',
    name: 'Bulgaria',
    dialCode: '+359',
    cities: [
      'Sofia',
    ],
  },
  {
    code: 'BF',
    name: 'Burkina Faso',
    dialCode: '+226',
    cities: [
      'Ouagadougou',
    ],
  },
  {
    code: 'BI',
    name: 'Burundi',
    dialCode: '+257',
    cities: [
      'Gitega',
    ],
  },
  {
    code: 'BT',
    name: 'Butan',
    dialCode: '+975',
    cities: [
      'Thimphu',
    ],
  },
  {
    code: 'CV',
    name: 'Cabo Verde',
    dialCode: '+238',
    cities: [
      'Praia',
    ],
  },
  {
    code: 'KH',
    name: 'Camboya',
    dialCode: '+855',
    cities: [
      'Phnom Penh',
    ],
  },
  {
    code: 'CM',
    name: 'Camerun',
    dialCode: '+237',
    cities: [
      'Yaounde',
    ],
  },
  {
    code: 'BQ',
    name: 'Caribe Neerlandes',
    dialCode: '+599',
    cities: [
      'Kralendijk',
    ],
  },
  {
    code: 'QA',
    name: 'Catar',
    dialCode: '+974',
    cities: [
      'Doha',
    ],
  },
  {
    code: 'TD',
    name: 'Chad',
    dialCode: '+235',
    cities: [
      'NDjamena',
    ],
  },
  {
    code: 'CZ',
    name: 'Chequia',
    dialCode: '+420',
    cities: [
      'Prague',
    ],
  },
  {
    code: 'CN',
    name: 'China',
    dialCode: '+86',
    cities: [
      'Beijing',
    ],
  },
  {
    code: 'CY',
    name: 'Chipre',
    dialCode: '+357',
    cities: [
      'Nicosia',
    ],
  },
  {
    code: 'VA',
    name: 'Ciudad del Vaticano',
    dialCode: '+3906698',
    cities: [
      'Vatican City',
    ],
  },
  {
    code: 'KM',
    name: 'Comoras',
    dialCode: '+269',
    cities: [
      'Moroni',
    ],
  },
  {
    code: 'CG',
    name: 'Congo',
    dialCode: '+242',
    cities: [
      'Brazzaville',
    ],
  },
  {
    code: 'CD',
    name: 'Congo (Rep. Dem.)',
    dialCode: '+243',
    cities: [
      'Kinshasa',
    ],
  },
  {
    code: 'KP',
    name: 'Corea del Norte',
    dialCode: '+850',
    cities: [
      'Pyongyang',
    ],
  },
  {
    code: 'CI',
    name: 'Costa de Marfil',
    dialCode: '+225',
    cities: [
      'Yamoussoukro',
    ],
  },
  {
    code: 'HR',
    name: 'Croacia',
    dialCode: '+385',
    cities: [
      'Zagreb',
    ],
  },
  {
    code: 'CW',
    name: 'Curazao',
    dialCode: '+599',
    cities: [
      'Willemstad',
    ],
  },
  {
    code: 'DJ',
    name: 'Djibouti',
    dialCode: '+253',
    cities: [
      'Djibouti',
    ],
  },
  {
    code: 'DM',
    name: 'Dominica',
    dialCode: '+1767',
    cities: [
      'Roseau',
    ],
  },
  {
    code: 'EG',
    name: 'Egipto',
    dialCode: '+20',
    cities: [
      'Cairo',
    ],
  },
  {
    code: 'AE',
    name: 'Emiratos Arabes Unidos',
    dialCode: '+971',
    cities: [
      'Abu Dhabi',
    ],
  },
  {
    code: 'ER',
    name: 'Eritrea',
    dialCode: '+291',
    cities: [
      'Asmara',
    ],
  },
  {
    code: 'SI',
    name: 'Eslovenia',
    dialCode: '+386',
    cities: [
      'Ljubljana',
    ],
  },
  {
    code: 'EE',
    name: 'Estonia',
    dialCode: '+372',
    cities: [
      'Tallinn',
    ],
  },
  {
    code: 'ET',
    name: 'Etiopia',
    dialCode: '+251',
    cities: [
      'Addis Ababa',
    ],
  },
  {
    code: 'PH',
    name: 'Filipinas',
    dialCode: '+63',
    cities: [
      'Manila',
    ],
  },
  {
    code: 'FJ',
    name: 'Fiyi',
    dialCode: '+679',
    cities: [
      'Suva',
    ],
  },
  {
    code: 'GA',
    name: 'Gabon',
    dialCode: '+241',
    cities: [
      'Libreville',
    ],
  },
  {
    code: 'GM',
    name: 'Gambia',
    dialCode: '+220',
    cities: [
      'Banjul',
    ],
  },
  {
    code: 'GE',
    name: 'Georgia',
    dialCode: '+995',
    cities: [
      'Tbilisi',
    ],
  },
  {
    code: 'GH',
    name: 'Ghana',
    dialCode: '+233',
    cities: [
      'Accra',
    ],
  },
  {
    code: 'GI',
    name: 'Gibraltar',
    dialCode: '+350',
    cities: [
      'Gibraltar',
    ],
  },
  {
    code: 'GR',
    name: 'Grecia',
    dialCode: '+30',
    cities: [
      'Athens',
    ],
  },
  {
    code: 'GD',
    name: 'Grenada',
    dialCode: '+1473',
    cities: [
      'St. Georges',
    ],
  },
  {
    code: 'GL',
    name: 'Groenlandia',
    dialCode: '+299',
    cities: [
      'Nuuk',
    ],
  },
  {
    code: 'GP',
    name: 'Guadalupe',
    dialCode: '+590',
    cities: [
      'Basse-Terre',
    ],
  },
  {
    code: 'GU',
    name: 'Guam',
    dialCode: '+1671',
    cities: [
      'Hagatna',
    ],
  },
  {
    code: 'GF',
    name: 'Guayana Francesa',
    dialCode: '+594',
    cities: [
      'Cayenne',
    ],
  },
  {
    code: 'GG',
    name: 'Guernsey',
    dialCode: '+44',
    cities: [
      'St. Peter Port',
    ],
  },
  {
    code: 'GN',
    name: 'Guinea',
    dialCode: '+224',
    cities: [
      'Conakry',
    ],
  },
  {
    code: 'GQ',
    name: 'Guinea Ecuatorial',
    dialCode: '+240',
    cities: [
      'Ciudad de la Paz',
    ],
  },
  {
    code: 'GW',
    name: 'Guinea-Bisau',
    dialCode: '+245',
    cities: [
      'Bissau',
    ],
  },
  {
    code: 'GY',
    name: 'Guyana',
    dialCode: '+592',
    cities: [
      'Georgetown',
    ],
  },
  {
    code: 'HT',
    name: 'Haiti',
    dialCode: '+509',
    cities: [
      'Port-au-Prince',
    ],
  },
  {
    code: 'HK',
    name: 'Hong Kong',
    dialCode: '+852',
    cities: [
      'City of Victoria',
    ],
  },
  {
    code: 'HU',
    name: 'Hungria',
    dialCode: '+36',
    cities: [
      'Budapest',
    ],
  },
  {
    code: 'ID',
    name: 'Indonesia',
    dialCode: '+62',
    cities: [
      'Jakarta',
    ],
  },
  {
    code: 'IQ',
    name: 'Irak',
    dialCode: '+964',
    cities: [
      'Baghdad',
    ],
  },
  {
    code: 'IR',
    name: 'Iran',
    dialCode: '+98',
    cities: [
      'Tehran',
    ],
  },
  {
    code: 'BV',
    name: 'Isla Bouvet',
    dialCode: '+47',
    cities: [
      'Isla Bouvet',
    ],
  },
  {
    code: 'IM',
    name: 'Isla de Man',
    dialCode: '+44',
    cities: [
      'Douglas',
    ],
  },
  {
    code: 'CX',
    name: 'Isla de Navidad',
    dialCode: '+61',
    cities: [
      'Flying Fish Cove',
    ],
  },
  {
    code: 'NF',
    name: 'Isla de Norfolk',
    dialCode: '+672',
    cities: [
      'Kingston',
    ],
  },
  {
    code: 'IS',
    name: 'Islandia',
    dialCode: '+354',
    cities: [
      'Reykjavik',
    ],
  },
  {
    code: 'KY',
    name: 'Islas Caiman',
    dialCode: '+1345',
    cities: [
      'George Town',
    ],
  },
  {
    code: 'CC',
    name: 'Islas Cocos o Islas Keeling',
    dialCode: '+61',
    cities: [
      'West Island',
    ],
  },
  {
    code: 'CK',
    name: 'Islas Cook',
    dialCode: '+682',
    cities: [
      'Avarua',
    ],
  },
  {
    code: 'FO',
    name: 'Islas Faroe',
    dialCode: '+298',
    cities: [
      'Torshavn',
    ],
  },
  {
    code: 'GS',
    name: 'Islas Georgias del Sur y Sandwich del Sur',
    dialCode: '+500',
    cities: [
      'King Edward Point',
    ],
  },
  {
    code: 'FK',
    name: 'Islas Malvinas',
    dialCode: '+500',
    cities: [
      'Stanley',
    ],
  },
  {
    code: 'MP',
    name: 'Islas Marianas del Norte',
    dialCode: '+1670',
    cities: [
      'Saipan',
    ],
  },
  {
    code: 'MH',
    name: 'Islas Marshall',
    dialCode: '+692',
    cities: [
      'Majuro',
    ],
  },
  {
    code: 'PN',
    name: 'Islas Pitcairn',
    dialCode: '+64',
    cities: [
      'Adamstown',
    ],
  },
  {
    code: 'SB',
    name: 'Islas Salomon',
    dialCode: '+677',
    cities: [
      'Honiara',
    ],
  },
  {
    code: 'SJ',
    name: 'Islas Svalbard y Jan Mayen',
    dialCode: '+4779',
    cities: [
      'Longyearbyen',
    ],
  },
  {
    code: 'TK',
    name: 'Islas Tokelau',
    dialCode: '+690',
    cities: [
      'Fakaofo',
    ],
  },
  {
    code: 'TC',
    name: 'Islas Turks y Caicos',
    dialCode: '+1649',
    cities: [
      'Cockburn Town',
    ],
  },
  {
    code: 'UM',
    name: 'Islas Ultramarinas Menores de Estados Unidos',
    dialCode: '+268',
    cities: [
      'Washington DC',
    ],
  },
  {
    code: 'VI',
    name: 'Islas Virgenes de los Estados Unidos',
    dialCode: '+1340',
    cities: [
      'Charlotte Amalie',
    ],
  },
  {
    code: 'VG',
    name: 'Islas Virgenes del Reino Unido',
    dialCode: '+1284',
    cities: [
      'Road Town',
    ],
  },
  {
    code: 'IL',
    name: 'Israel',
    dialCode: '+972',
    cities: [
      'Jerusalem',
    ],
  },
  {
    code: 'JM',
    name: 'Jamaica',
    dialCode: '+1876',
    cities: [
      'Kingston',
    ],
  },
  {
    code: 'JE',
    name: 'Jersey',
    dialCode: '+44',
    cities: [
      'Saint Helier',
    ],
  },
  {
    code: 'JO',
    name: 'Jordania',
    dialCode: '+962',
    cities: [
      'Amman',
    ],
  },
  {
    code: 'KZ',
    name: 'Kazajistan',
    dialCode: '+76',
    cities: [
      'Astana',
    ],
  },
  {
    code: 'KE',
    name: 'Kenia',
    dialCode: '+254',
    cities: [
      'Nairobi',
    ],
  },
  {
    code: 'KG',
    name: 'Kirguizistan',
    dialCode: '+996',
    cities: [
      'Bishkek',
    ],
  },
  {
    code: 'KI',
    name: 'Kiribati',
    dialCode: '+686',
    cities: [
      'South Tarawa',
    ],
  },
  {
    code: 'XK',
    name: 'Kosovo',
    dialCode: '+383',
    cities: [
      'Pristina',
    ],
  },
  {
    code: 'KW',
    name: 'Kuwait',
    dialCode: '+965',
    cities: [
      'Kuwait City',
    ],
  },
  {
    code: 'LA',
    name: 'Laos',
    dialCode: '+856',
    cities: [
      'Vientiane',
    ],
  },
  {
    code: 'LS',
    name: 'Lesotho',
    dialCode: '+266',
    cities: [
      'Maseru',
    ],
  },
  {
    code: 'LV',
    name: 'Letonia',
    dialCode: '+371',
    cities: [
      'Riga',
    ],
  },
  {
    code: 'LB',
    name: 'Libano',
    dialCode: '+961',
    cities: [
      'Beirut',
    ],
  },
  {
    code: 'LR',
    name: 'Liberia',
    dialCode: '+231',
    cities: [
      'Monrovia',
    ],
  },
  {
    code: 'LY',
    name: 'Libia',
    dialCode: '+218',
    cities: [
      'Tripoli',
    ],
  },
  {
    code: 'LI',
    name: 'Liechtenstein',
    dialCode: '+423',
    cities: [
      'Vaduz',
    ],
  },
  {
    code: 'LT',
    name: 'Lituania',
    dialCode: '+370',
    cities: [
      'Vilnius',
    ],
  },
  {
    code: 'LU',
    name: 'Luxemburgo',
    dialCode: '+352',
    cities: [
      'Luxembourg',
    ],
  },
  {
    code: 'MO',
    name: 'Macao',
    dialCode: '+853',
    cities: [
      'Macao',
    ],
  },
  {
    code: 'MK',
    name: 'Macedonia del Norte',
    dialCode: '+389',
    cities: [
      'Skopje',
    ],
  },
  {
    code: 'MG',
    name: 'Madagascar',
    dialCode: '+261',
    cities: [
      'Antananarivo',
    ],
  },
  {
    code: 'MY',
    name: 'Malasia',
    dialCode: '+60',
    cities: [
      'Kuala Lumpur',
    ],
  },
  {
    code: 'MW',
    name: 'Malawi',
    dialCode: '+265',
    cities: [
      'Lilongwe',
    ],
  },
  {
    code: 'MV',
    name: 'Maldivas',
    dialCode: '+960',
    cities: [
      'Male',
    ],
  },
  {
    code: 'ML',
    name: 'Mali',
    dialCode: '+223',
    cities: [
      'Bamako',
    ],
  },
  {
    code: 'MT',
    name: 'Malta',
    dialCode: '+356',
    cities: [
      'Valletta',
    ],
  },
  {
    code: 'MA',
    name: 'Marruecos',
    dialCode: '+212',
    cities: [
      'Rabat',
    ],
  },
  {
    code: 'MQ',
    name: 'Martinica',
    dialCode: '+596',
    cities: [
      'Fort-de-France',
    ],
  },
  {
    code: 'MU',
    name: 'Mauricio',
    dialCode: '+230',
    cities: [
      'Port Louis',
    ],
  },
  {
    code: 'MR',
    name: 'Mauritania',
    dialCode: '+222',
    cities: [
      'Nouakchott',
    ],
  },
  {
    code: 'YT',
    name: 'Mayotte',
    dialCode: '+262',
    cities: [
      'Mamoudzou',
    ],
  },
  {
    code: 'FM',
    name: 'Micronesia',
    dialCode: '+691',
    cities: [
      'Palikir',
    ],
  },
  {
    code: 'MD',
    name: 'Moldavia',
    dialCode: '+373',
    cities: [
      'Chisinau',
    ],
  },
  {
    code: 'MC',
    name: 'Monaco',
    dialCode: '+377',
    cities: [
      'Monaco',
    ],
  },
  {
    code: 'MN',
    name: 'Mongolia',
    dialCode: '+976',
    cities: [
      'Ulan Bator',
    ],
  },
  {
    code: 'ME',
    name: 'Montenegro',
    dialCode: '+382',
    cities: [
      'Podgorica',
    ],
  },
  {
    code: 'MS',
    name: 'Montserrat',
    dialCode: '+1664',
    cities: [
      'Plymouth',
    ],
  },
  {
    code: 'MZ',
    name: 'Mozambique',
    dialCode: '+258',
    cities: [
      'Maputo',
    ],
  },
  {
    code: 'MM',
    name: 'Myanmar',
    dialCode: '+95',
    cities: [
      'Naypyidaw',
    ],
  },
  {
    code: 'NA',
    name: 'Namibia',
    dialCode: '+264',
    cities: [
      'Windhoek',
    ],
  },
  {
    code: 'NR',
    name: 'Nauru',
    dialCode: '+674',
    cities: [
      'Yaren',
    ],
  },
  {
    code: 'NP',
    name: 'Nepal',
    dialCode: '+977',
    cities: [
      'Kathmandu',
    ],
  },
  {
    code: 'NE',
    name: 'Niger',
    dialCode: '+227',
    cities: [
      'Niamey',
    ],
  },
  {
    code: 'NG',
    name: 'Nigeria',
    dialCode: '+234',
    cities: [
      'Abuja',
    ],
  },
  {
    code: 'NU',
    name: 'Niue',
    dialCode: '+683',
    cities: [
      'Alofi',
    ],
  },
  {
    code: 'NC',
    name: 'Nueva Caledonia',
    dialCode: '+687',
    cities: [
      'Noumea',
    ],
  },
  {
    code: 'OM',
    name: 'Oman',
    dialCode: '+968',
    cities: [
      'Muscat',
    ],
  },
  {
    code: 'PK',
    name: 'Pakistan',
    dialCode: '+92',
    cities: [
      'Islamabad',
    ],
  },
  {
    code: 'PW',
    name: 'Palau',
    dialCode: '+680',
    cities: [
      'Ngerulmud',
    ],
  },
  {
    code: 'PS',
    name: 'Palestina',
    dialCode: '+970',
    cities: [
      'Ramallah',
      'Jerusalem',
    ],
  },
  {
    code: 'PG',
    name: 'Papua Nueva Guinea',
    dialCode: '+675',
    cities: [
      'Port Moresby',
    ],
  },
  {
    code: 'PF',
    name: 'Polinesia Francesa',
    dialCode: '+689',
    cities: [
      'Papeete',
    ],
  },
  {
    code: 'PL',
    name: 'Polonia',
    dialCode: '+48',
    cities: [
      'Warsaw',
    ],
  },
  {
    code: 'PR',
    name: 'Puerto Rico',
    dialCode: '+1787',
    cities: [
      'San Juan',
    ],
  },
  {
    code: 'CF',
    name: 'Republica Centroafricana',
    dialCode: '+236',
    cities: [
      'Bangui',
    ],
  },
  {
    code: 'SK',
    name: 'Republica Eslovaca',
    dialCode: '+421',
    cities: [
      'Bratislava',
    ],
  },
  {
    code: 'RE',
    name: 'Reunion',
    dialCode: '+262',
    cities: [
      'Saint-Denis',
    ],
  },
  {
    code: 'RW',
    name: 'Ruanda',
    dialCode: '+250',
    cities: [
      'Kigali',
    ],
  },
  {
    code: 'RO',
    name: 'Rumania',
    dialCode: '+40',
    cities: [
      'Bucharest',
    ],
  },
  {
    code: 'RU',
    name: 'Rusia',
    dialCode: '+73',
    cities: [
      'Moscow',
    ],
  },
  {
    code: 'EH',
    name: 'Sahara Occidental',
    dialCode: '+2125288',
    cities: [
      'El Aaiun',
    ],
  },
  {
    code: 'MF',
    name: 'Saint Martin',
    dialCode: '+590',
    cities: [
      'Marigot',
    ],
  },
  {
    code: 'WS',
    name: 'Samoa',
    dialCode: '+685',
    cities: [
      'Apia',
    ],
  },
  {
    code: 'AS',
    name: 'Samoa Americana',
    dialCode: '+1684',
    cities: [
      'Pago Pago',
    ],
  },
  {
    code: 'BL',
    name: 'San Bartolome',
    dialCode: '+590',
    cities: [
      'Gustavia',
    ],
  },
  {
    code: 'KN',
    name: 'San Cristobal y Nieves',
    dialCode: '+1869',
    cities: [
      'Basseterre',
    ],
  },
  {
    code: 'SM',
    name: 'San Marino',
    dialCode: '+378',
    cities: [
      'City of San Marino',
    ],
  },
  {
    code: 'PM',
    name: 'San Pedro y Miquelon',
    dialCode: '+508',
    cities: [
      'Saint-Pierre',
    ],
  },
  {
    code: 'VC',
    name: 'San Vicente y Granadinas',
    dialCode: '+1784',
    cities: [
      'Kingstown',
    ],
  },
  {
    code: 'SH',
    name: 'Santa Elena, Ascension y Tristan de Acuna',
    dialCode: '+290',
    cities: [
      'Jamestown',
    ],
  },
  {
    code: 'LC',
    name: 'Santa Lucia',
    dialCode: '+1758',
    cities: [
      'Castries',
    ],
  },
  {
    code: 'ST',
    name: 'Santo Tome y Principe',
    dialCode: '+239',
    cities: [
      'Sao Tome',
    ],
  },
  {
    code: 'SN',
    name: 'Senegal',
    dialCode: '+221',
    cities: [
      'Dakar',
    ],
  },
  {
    code: 'RS',
    name: 'Serbia',
    dialCode: '+381',
    cities: [
      'Belgrade',
    ],
  },
  {
    code: 'SC',
    name: 'Seychelles',
    dialCode: '+248',
    cities: [
      'Victoria',
    ],
  },
  {
    code: 'SL',
    name: 'Sierra Leone',
    dialCode: '+232',
    cities: [
      'Freetown',
    ],
  },
  {
    code: 'SG',
    name: 'Singapur',
    dialCode: '+65',
    cities: [
      'Singapore',
    ],
  },
  {
    code: 'SX',
    name: 'Sint Maarten',
    dialCode: '+1721',
    cities: [
      'Philipsburg',
    ],
  },
  {
    code: 'SY',
    name: 'Siria',
    dialCode: '+963',
    cities: [
      'Damascus',
    ],
  },
  {
    code: 'SO',
    name: 'Somalia',
    dialCode: '+252',
    cities: [
      'Mogadishu',
    ],
  },
  {
    code: 'LK',
    name: 'Sri Lanka',
    dialCode: '+94',
    cities: [
      'Sri Jayawardenepura Kotte',
    ],
  },
  {
    code: 'SZ',
    name: 'Suazilandia',
    dialCode: '+268',
    cities: [
      'Mbabane',
    ],
  },
  {
    code: 'SD',
    name: 'Sudan',
    dialCode: '+249',
    cities: [
      'Khartoum',
    ],
  },
  {
    code: 'SS',
    name: 'Sudan del Sur',
    dialCode: '+211',
    cities: [
      'Juba',
    ],
  },
  {
    code: 'SR',
    name: 'Surinam',
    dialCode: '+597',
    cities: [
      'Paramaribo',
    ],
  },
  {
    code: 'TH',
    name: 'Tailandia',
    dialCode: '+66',
    cities: [
      'Bangkok',
    ],
  },
  {
    code: 'TW',
    name: 'Taiwan',
    dialCode: '+886',
    cities: [
      'Taipei',
    ],
  },
  {
    code: 'TZ',
    name: 'Tanzania',
    dialCode: '+255',
    cities: [
      'Dodoma',
    ],
  },
  {
    code: 'TJ',
    name: 'Tayikistan',
    dialCode: '+992',
    cities: [
      'Dushanbe',
    ],
  },
  {
    code: 'IO',
    name: 'Territorio Britanico del Oceano Indico',
    dialCode: '+246',
    cities: [
      'Diego Garcia',
    ],
  },
  {
    code: 'TF',
    name: 'Tierras Australes y Antarticas Francesas',
    dialCode: '+262',
    cities: [
      'Port-aux-Francais',
    ],
  },
  {
    code: 'TL',
    name: 'Timor Oriental',
    dialCode: '+670',
    cities: [
      'Dili',
    ],
  },
  {
    code: 'TG',
    name: 'Togo',
    dialCode: '+228',
    cities: [
      'Lome',
    ],
  },
  {
    code: 'TO',
    name: 'Tonga',
    dialCode: '+676',
    cities: [
      'Nukualofa',
    ],
  },
  {
    code: 'TT',
    name: 'Trinidad y Tobago',
    dialCode: '+1868',
    cities: [
      'Port of Spain',
    ],
  },
  {
    code: 'TN',
    name: 'Tunez',
    dialCode: '+216',
    cities: [
      'Tunis',
    ],
  },
  {
    code: 'TM',
    name: 'Turkmenistan',
    dialCode: '+993',
    cities: [
      'Ashgabat',
    ],
  },
  {
    code: 'TR',
    name: 'Turquia',
    dialCode: '+90',
    cities: [
      'Ankara',
    ],
  },
  {
    code: 'TV',
    name: 'Tuvalu',
    dialCode: '+688',
    cities: [
      'Funafuti',
    ],
  },
  {
    code: 'UA',
    name: 'Ucrania',
    dialCode: '+380',
    cities: [
      'Kyiv',
    ],
  },
  {
    code: 'UG',
    name: 'Uganda',
    dialCode: '+256',
    cities: [
      'Kampala',
    ],
  },
  {
    code: 'UZ',
    name: 'Uzbekistan',
    dialCode: '+998',
    cities: [
      'Tashkent',
    ],
  },
  {
    code: 'VU',
    name: 'Vanuatu',
    dialCode: '+678',
    cities: [
      'Port Vila',
    ],
  },
  {
    code: 'VN',
    name: 'Vietnam',
    dialCode: '+84',
    cities: [
      'Hanoi',
    ],
  },
  {
    code: 'WF',
    name: 'Wallis y Futuna',
    dialCode: '+681',
    cities: [
      'Mata-Utu',
    ],
  },
  {
    code: 'YE',
    name: 'Yemen',
    dialCode: '+967',
    cities: [
      'Sanaa',
    ],
  },
  {
    code: 'ZM',
    name: 'Zambia',
    dialCode: '+260',
    cities: [
      'Lusaka',
    ],
  },
  {
    code: 'ZW',
    name: 'Zimbabue',
    dialCode: '+263',
    cities: [
      'Harare',
    ],
  },
]

export function findCountryByCode(code: string | null | undefined) {
  const normalized = String(code ?? '').trim().toUpperCase()
  if (!normalized) return null
  return countryCityCatalog.find((entry) => entry.code.toUpperCase() === normalized) ?? null
}

export function findCountryByNameOrCode(value: string | null | undefined) {
  const normalized = String(value ?? '').trim().toLowerCase()
  if (!normalized) return null
  return countryCityCatalog.find((entry) => entry.code.toLowerCase() === normalized || entry.name.toLowerCase() === normalized) ?? null
}
