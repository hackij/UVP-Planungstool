import packageJson from "../package.json";

export const APP_VERSION = import.meta.env.VITE_APP_VERSION?.trim() || packageJson.version;
export const APP_ACCESS_CODE = import.meta.env.VITE_APP_ACCESS_CODE?.trim() || "bs1bt";
export const ACCESS_SESSION_KEY = "uvp-studio-access-granted";

const creditText = "entwickelt von Jan Hacker unter fachlicher Beratung von Prof. Dr. Manfred Müller und Dr. Moritz Dier für die gewerblich-technische Universitätsberufsschule Bayreuth";

export const APP_FOOTER_TEXT = `Erstellt mit UVP Studio · Version ${APP_VERSION} – ${creditText}`;
