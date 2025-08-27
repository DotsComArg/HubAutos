// Datos de fallback para cuando la API de Info Autos no funcione
const fallbackData = {
  years: Array.from({length: 27}, (_, i) => ({
    id: (2000 + i).toString(),
    name: (2000 + i).toString()
  })),
  
  brands: {
    // Marcas básicas para todos los años
    default: [
      { id: "1", name: "Chevrolet" },
      { id: "2", name: "Ford" },
      { id: "3", name: "Volkswagen" },
      { id: "4", name: "Toyota" },
      { id: "5", name: "Renault" },
      { id: "6", name: "Peugeot" },
      { id: "7", name: "Fiat" },
      { id: "8", name: "Honda" },
      { id: "9", name: "Nissan" },
      { id: "10", name: "Hyundai" },
      { id: "11", name: "Mercedes-Benz" },
      { id: "12", name: "BMW" },
      { id: "13", name: "Audi" },
      { id: "14", name: "Citroën" },
      { id: "15", name: "Kia" }
    ]
  },
  
  models: {
    // Modelos básicos por marca
    "1": [ // Chevrolet
      { id: "1", name: "Onix" },
      { id: "2", name: "Tracker" },
      { id: "3", name: "Cruze" },
      { id: "4", name: "Prisma" },
      { id: "5", name: "Cobalt" }
    ],
    "2": [ // Ford
      { id: "1", name: "Ranger" },
      { id: "2", name: "Territory" },
      { id: "3", name: "Focus" },
      { id: "4", name: "EcoSport" },
      { id: "5", name: "Fiesta" }
    ],
    "3": [ // Volkswagen
      { id: "1", name: "Gol Trend" },
      { id: "2", name: "Virtus" },
      { id: "3", name: "T-Cross" },
      { id: "4", name: "Amarok" },
      { id: "5", name: "Polo" }
    ],
    "4": [ // Toyota
      { id: "1", name: "Hilux" },
      { id: "2", name: "Corolla Cross" },
      { id: "3", name: "Yaris" },
      { id: "4", name: "SW4" },
      { id: "5", name: "Corolla" }
    ],
    "5": [ // Renault
      { id: "1", name: "Sandero" },
      { id: "2", name: "Logan" },
      { id: "3", name: "Duster" },
      { id: "4", name: "Kangoo" },
      { id: "5", name: "Clio" }
    ]
  },
  
  versions: {
    // Versiones básicas por modelo
    "1": [ // Onix
      { id: "1", name: "LTZ" },
      { id: "2", name: "Premier" },
      { id: "3", name: "Activ" }
    ],
    "2": [ // Tracker
      { id: "1", name: "LTZ" },
      { id: "2", name: "Premier" },
      { id: "3", name: "Activ" }
    ],
    "3": [ // Cruze
      { id: "1", name: "LTZ" },
      { id: "2", name: "Premier" },
      { id: "3", name: "Activ" }
    ]
  }
};

module.exports = fallbackData;
