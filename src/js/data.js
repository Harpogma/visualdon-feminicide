/**
 * data.js
 * Toutes les données statistiques et sources du projet
 */

export const INFRACTION_DATA = [
  { type: 'Voies de fait',                  valeur: 6378 },
  { type: 'Menaces',                         valeur: 4090 },
  { type: 'Insultes',                        valeur: 3807 },
  { type: 'Lésions corporelles simples',     valeur: 2045 },
  { type: 'Infractions sexuelles sur enfants', valeur: 407 },
  { type: 'Homicides ou tentatives',         valeur: 88   },
]

export const SOURCES_MAP = {
  'jour-j': [
    { label: 'Féminicides recensés — Stop Femizid', url: 'https://www.stopfemizid.ch/francais' },
  ],
  'j-3-jours': [
    { label: 'Violence domestique — EDI (50 % au domicile)', url: 'https://www.edi.admin.ch/fr/violence-domestique-sexuelle-et-de-genre-la-premiere-campagne-nationale-de-prevention-est-lancee' },
  ],
  'j-3-semaines': [
    { label: 'Féminicide après rupture — 24 Heures', url: 'https://www.24heures.ch/feminicide-la-rupture-moment-fatal-pour-les-femmes-247104825849' },
  ],
  'j-2-mois': [
    { label: 'Statistiques violence domestique — EBG', url: 'https://www.ebg.admin.ch/dam/fr/sd-web/YXpdk4fA4TpV/a4_chiffres-de-la-violence-domestique-en-suisse.pdf' },
    { label: 'Campagne nationale — EDI', url: 'https://www.edi.admin.ch/fr/violence-domestique-sexuelle-et-de-genre-la-premiere-campagne-nationale-de-prevention-est-lancee' },
  ],
  'j-1-an': [
    { label: 'Infractions violence domestique 2023 — EBG', url: 'https://www.ebg.admin.ch/dam/fr/sd-web/YXpdk4fA4TpV/a4_chiffres-de-la-violence-domestique-en-suisse.pdf' },
  ],
  'j-2-ans': [
    { label: 'Profil des auteurs de féminicides — 24 Heures', url: 'https://www.24heures.ch/suisse-le-profil-des-auteurs-de-feminicides-190676825350' },
  ],
  'j-15-ans': [
    { label: 'Féminicides recensés — Stop Femizid', url: 'https://www.stopfemizid.ch/francais' },
  ],
  'j-30-ans': [
    { label: 'Infractions violence domestique 2023 — EBG', url: 'https://www.ebg.admin.ch/dam/fr/sd-web/YXpdk4fA4TpV/a4_chiffres-de-la-violence-domestique-en-suisse.pdf' },
  ],
  'j-46-ans': [
    { label: 'Actes sexuels sur enfants — OFS', url: 'https://www.bfs.admin.ch/bfs/fr/home/actualites/quoi-de-neuf.assetdetail.36456053.html' },
  ],
}
