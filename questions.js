// questions.js
const questionsPool = {
    "Allgemeines": [
        { q: "Was ist das chemische Symbol für Gold?", opts: ["Au", "Ag", "Fe", "Go"], correct: 0 },
        { q: "Wie viele Planeten hat unser Sonnensystem?", opts: ["7", "8", "9", "10"], correct: 1 },
        { q: "Wer schrieb 'Faust'?", opts: ["Schiller", "Goethe", "Lessing", "Kafka"], correct: 1 },
        { q: "Was ist die Hauptstadt von Frankreich?", opts: ["Lyon", "Marseille", "Paris", "Nizza"], correct: 2 },
        { q: "Welches Tier ist das schnellste der Welt?", opts: ["Gepard", "Wanderfalke", "Segelfisch", "Antilope"], correct: 1 },
        { q: "Wie viele Bundesländer hat Deutschland?", opts: ["14", "15", "16", "17"], correct: 2 },
        { q: "Was ist der größte Ozean der Erde?", opts: ["Atlantik", "Indischer Ozean", "Pazifik", "Arktischer Ozean"], correct: 2 },
        { q: "Wer erfand das Telefon?", opts: ["Edison", "Bell", "Tesla", "Einstein"], correct: 1 },
        { q: "Aus wie vielen Knochen besteht ein erwachsener Mensch ca.?", opts: ["150", "206", "300", "500"], correct: 1 },
        { q: "Welches ist das größte Säugetier der Welt?", opts: ["Elefant", "Blauwal", "Giraffe", "Nashorn"], correct: 1 }
    ],
    "Die Welt": [
        { q: "Welcher Fluss ist der längste der Welt?", opts: ["Amazonas", "Nil", "Jangtsekiang", "Mississippi"], correct: 1 },
        { q: "Wo steht die Freiheitsstatue?", opts: ["London", "Berlin", "New York", "Paris"], correct: 2 },
        { q: "Welches Gebirge trennt Europa und Asien?", opts: ["Alpen", "Anden", "Ural", "Himalaya"], correct: 2 },
        { q: "Welcher Kontinent ist am trockensten?", opts: ["Australien", "Afrika", "Antarktis", "Südamerika"], correct: 2 },
        { q: "Wie heißt der höchste Berg der Welt?", opts: ["K2", "Mont Blanc", "Mount Everest", "Kilimandscharo"], correct: 2 },
        { q: "Welcher Ozean liegt zwischen Europa und Amerika?", opts: ["Pazifik", "Atlantik", "Indischer Ozean", "Südlicher Ozean"], correct: 1 },
        { q: "Wie nennt man die Linie, die die Erde in Nord- und Südhalbkugel teilt?", opts: ["Polarkreis", "Wendekreis", "Äquator", "Nullmeridian"], correct: 2 },
        { q: "In welchem Land liegen die Pyramiden von Gizeh?", opts: ["Türkei", "Ägypten", "Libyen", "Griechenland"], correct: 1 },
        { q: "Was ist der größte Regenwald der Welt?", opts: ["Kongo-Becken", "Amazonas", "Indonesien", "Borneo"], correct: 1 },
        { q: "Welches Meer ist das salzhaltigste?", opts: ["Totes Meer", "Schwarzes Meer", "Rotes Meer", "Mittelmeer"], correct: 0 }
    ],
    "Kontinente": [
        { q: "Welcher Kontinent ist der bevölkerungsreichste?", opts: ["Afrika", "Europa", "Asien", "Amerika"], correct: 2 },
        { q: "Auf welchem Kontinent liegt die Sahara?", opts: ["Asien", "Afrika", "Australien", "Amerika"], correct: 1 },
        { q: "Welcher Kontinent wird auch 'Down Under' genannt?", opts: ["Amerika", "Australien", "Antarktis", "Europa"], correct: 1 },
        { q: "Wie viele Kontinente gibt es offiziell?", opts: ["5", "6", "7", "8"], correct: 2 },
        { q: "Welcher Kontinent hat keine permanente Bevölkerung?", opts: ["Australien", "Arktis", "Antarktis", "Grönland"], correct: 2 },
        { q: "In welchem Kontinent liegt der Amazonas?", opts: ["Südamerika", "Nordamerika", "Afrika", "Asien"], correct: 0 },
        { q: "Welcher Kontinent ist der kleinste?", opts: ["Europa", "Australien", "Antarktis", "Südamerika"], correct: 1 },
        { q: "Welcher Kontinent umfasst nur ein einziges Land?", opts: ["Australien", "Antarktis", "Europa", "Afrika"], correct: 0 },
        { q: "Was verbindet Nord- und Südamerika?", opts: ["Panama-Enge", "Suez-Kanal", "Beringstraße", "Gibraltar"], correct: 0 },
        { q: "Auf welchem Kontinent liegt Italien?", opts: ["Asien", "Europa", "Afrika", "Amerika"], correct: 1 }
    ],
    "Länder": [
        { q: "Welches Land hat die meisten Einwohner?", opts: ["Indien", "USA", "China", "Brasilien"], correct: 0 },
        { q: "Was ist die Hauptstadt von Japan?", opts: ["Seoul", "Tokio", "Peking", "Bangkok"], correct: 1 },
        { q: "Welches Land ist flächenmäßig das größte?", opts: ["USA", "Kanada", "China", "Russland"], correct: 3 },
        { q: "Welches Land ist als 'Land der aufgehenden Sonne' bekannt?", opts: ["China", "Korea", "Japan", "Thailand"], correct: 2 },
        { q: "Welche Währung hat die Schweiz?", opts: ["Euro", "Schweizer Franken", "Dollar", "Pfund"], correct: 1 },
        { q: "Wie heißt die Hauptstadt von Australien?", opts: ["Sydney", "Melbourne", "Canberra", "Perth"], correct: 2 },
        { q: "Welches Land ist das kleinste der Welt?", opts: ["Monaco", "Vatikanstadt", "San Marino", "Liechtenstein"], correct: 1 },
        { q: "In welchem Land liegt Machu Picchu?", opts: ["Chile", "Peru", "Mexiko", "Bolivien"], correct: 1 },
        { q: "Welches Land ist berühmt für seine Fjorde?", opts: ["Schweden", "Finnland", "Norwegen", "Dänemark"], correct: 2 },
        { q: "Was ist die Hauptstadt von Kanada?", opts: ["Toronto", "Vancouver", "Ottawa", "Montreal"], correct: 2 }
    ]

};
module.exports = { questionsPool};
