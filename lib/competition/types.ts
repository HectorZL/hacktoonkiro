export type CompetitionGameKey = "trivia-ecuador" | "animales" | "impostor" | "charadas";

export type CompetitionPlayer = {
  id: string;
  name: string;
  avatarKey?: string;
};

export type CompetitionSetup = {
  id: string;
  gameKey: CompetitionGameKey;
  rounds: number;
  secondsPerTurn: number;
  players: CompetitionPlayer[];
  startedAt: string;
};

export type CompetitionResultPlayer = CompetitionPlayer & {
  score: number;
};

export type CompetitionResult = {
  id: string;
  gameKey: CompetitionGameKey;
  rounds: number;
  players: CompetitionResultPlayer[];
  startedAt: string;
  endedAt: string;
};

export type TriviaQuestion = {
  id: string;
  question: string;
  options: string[];
  correctOption: number;
  category: string;
  explanation?: string;
};

export const competitionGameMeta: Record<
  CompetitionGameKey,
  { title: string; description: string; icon: string; privateTurn: boolean }
> = {
  "trivia-ecuador": {
    title: "Trivia de Ecuador",
    description: "Preguntas sobre nuestra historia, cultura, naturaleza y lugares.",
    icon: "🇪🇨",
    privateTurn: true,
  },
  animales: {
    title: "Animales y mímica",
    description: "Representa un animal sin hablar para que los demás lo adivinen.",
    icon: "🐒",
    privateTurn: true,
  },
  impostor: {
    title: "Impostor",
    description: "Descubre quién no conoce la palabra secreta.",
    icon: "🕵️",
    privateTurn: true,
  },
  charadas: {
    title: "Charadas",
    description: "Actúa una palabra o situación y deja que el grupo la adivine.",
    icon: "🎭",
    privateTurn: true,
  },
};

export const fallbackTriviaQuestions: TriviaQuestion[] = [
  {
    id: "fallback-1",
    question: "¿Cuál es la capital del Ecuador?",
    options: ["Quito", "Guayaquil", "Cuenca", "Loja"],
    correctOption: 0,
    category: "Geografía",
    explanation: "Quito es la capital del Ecuador y está ubicada en la región Andina.",
  },
  {
    id: "fallback-2",
    question: "¿En qué ciudad se encuentra el monumento de la Mitad del Mundo?",
    options: ["Quito", "Ambato", "Manta", "Riobamba"],
    correctOption: 0,
    category: "Cultura",
    explanation: "La Ciudad Mitad del Mundo está al norte de Quito, en la provincia de Pichincha.",
  },
  {
    id: "fallback-3",
    question: "¿Qué archipiélago ecuatoriano es famoso por su biodiversidad?",
    options: ["Galápagos", "Jambelí", "Puná", "Chiloé"],
    correctOption: 0,
    category: "Naturaleza",
    explanation: "Las islas Galápagos son conocidas por sus especies únicas y su valor natural.",
  },
  {
    id: "fallback-4",
    question: "¿Cuál de estos platos es tradicional de la costa ecuatoriana?",
    options: ["Encebollado", "Fanesca", "Llapingacho", "Yahuarlocro"],
    correctOption: 0,
    category: "Gastronomía",
    explanation: "El encebollado es una preparación muy popular de la costa del Ecuador.",
  },
  {
    id: "fallback-5",
    question: "¿Qué colores aparecen en la bandera del Ecuador?",
    options: ["Amarillo, azul y rojo", "Verde, blanco y azul", "Rojo, blanco y negro", "Azul y blanco"],
    correctOption: 0,
    category: "Historia",
    explanation: "La bandera ecuatoriana tiene franjas amarilla, azul y roja.",
  },
  {
    id: "fallback-6",
    question: "¿Cuál es una ciudad conocida como Patrimonio Cultural de la Humanidad?",
    options: ["Cuenca", "Machala", "Quevedo", "Esmeraldas"],
    correctOption: 0,
    category: "Cultura",
    explanation: "El centro histórico de Cuenca es Patrimonio Cultural de la Humanidad.",
  },
  {
    id: "fallback-7",
    question: "¿Qué animal es representativo de las islas Galápagos?",
    options: ["La tortuga gigante", "El oso polar", "El canguro", "El camello"],
    correctOption: 0,
    category: "Naturaleza",
    explanation: "Las tortugas gigantes son una de las especies más representativas de Galápagos.",
  },
  {
    id: "fallback-8",
    question: "¿Cuál de estas ciudades está en la región amazónica del Ecuador?",
    options: ["Tena", "Salinas", "Ibarra", "Daule"],
    correctOption: 0,
    category: "Geografía",
    explanation: "Tena es una ciudad de la Amazonía ecuatoriana y capital de Napo.",
  },
];
