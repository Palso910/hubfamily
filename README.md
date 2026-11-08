# Hub Courses — Next.js 14 + Supabase + Vercel

## Déploiement (10 lignes)
1. Crée un projet **Supabase** → SQL Editor → colle `supabase/schema.sql` → Run (une seule fois).
2. Copie `.env.example` en `.env.local` et configure les variables Supabase et le code famille.
3. La clé `SUPABASE_SERVICE_ROLE_KEY` reste côté serveur uniquement ; elle est requise pour les fonctions admin.
4. Test local : `npm install && npm run dev` → http://localhost:3000
5. Pousse le dossier sur GitHub → **Vercel** → Import → ajoute les 5 variables d'environnement → Deploy.
6. Mets l'URL Vercel dans `NEXT_PUBLIC_SITE_URL`, puis redéploie.
7. Après le code famille, choisis le profil **Paul**, **Maman** ou **Étienne**.
8. Les vues Paul et Étienne ouvrent l’admin sans mot de passe ; 🔒 efface le profil et le code pour revenir à l’écran PIN.
9. Toute personne qui connaît le code famille peut utiliser les fonctions admin.

## Fonctionnalité → fichier
| Fonctionnalité | Où |
|---|---|
| Gate PIN (cookie signé 90 j, 3 essais puis pause) | `middleware.ts`, `app/api/pin/route.ts`, `app/pin/*`, `lib/sign.ts` |
| Verrouiller | `components/Header.tsx` (DELETE `/api/pin`) |
| Fil d'articles, filtres, recherche, promo, sélection du moment | `components/Feed.tsx` |
| Commentaires, réactions, « Lien cassé ? » | `components/Feed.tsx` |
| Requêtes (envoi, 1-tap valider/refuser, historique) | `components/Requests.tsx` + trigger `guard_request` |
| Toast statut de requête / nouvel article | `app/page.tsx` |
| Paniers + budgets (en base, cookie `hub_sid`) | `components/Carts.tsx` |
| Boutique partenaires, onboarding | `app/page.tsx` |
| Choix du profil et sélection signée (après PIN) | `app/page.tsx`, `app/api/viewpoint/route.ts`, `lib/sign.ts` |
| Admin Paul/Étienne sans mot de passe séparé | `app/admin/page.tsx`, `app/api/admin/*`, `lib/adminServer.ts` |
| Articles admin, upload compressé, vérification de lien | `app/admin/page.tsx`, `app/api/check-link/route.ts`, `lib/utils.ts` |
| Historique de prix + courbe SVG | trigger `log_price` (SQL), `Spark` dans `app/admin/page.tsx` |
| Pastilles personnalisées | onglet Pastilles (`app/admin/page.tsx`), `components/Badge.tsx` |
| Thème live, 23 palettes + libre, contrastes, logo, textes | `lib/palettes.ts`, onglet Thème, `components/Header.tsx` |
| Liste de cadeaux (PDF/WhatsApp) | `app/cadeaux/page.tsx` |
| Multi-membres, cloisonnement Paul/Étienne | table `profiles`, policies RLS (`schema.sql`) |
| PWA | `public/manifest.webmanifest`, icônes |

## 5 tests temps réel (2 onglets : A = Maman, B = admin Paul)
1. **Article** : B publie un article → A voit le toast « Un nouvel article… » et la carte en < 2 s.
2. **Commentaire** : A commente → B le voit (pastille 💬) ; B répond → bulle admin chez A.
3. **Requête** : B (Paul) envoie « Sortie potes » → A voit la carte (« Demande de Paul 🅿️ »), clique ✅ → B voit le statut et le toast « Maman a validé ta demande ✅ ».
4. **Panier** : A crée « Noël » (300 €), ajoute 2 articles → total et reste corrects ; recharge : le panier persiste.
5. **Statut / thème** : B passe un article en « Rupture » puis change de palette → A voit les deux changements sans rechargement.

## À savoir
- Les 23 palettes sont dans `lib/palettes.ts` (pas en base) ; seul le choix actif est dans `site_settings`.
- Certains sites (Zalando, Nike) bloquent les robots : la vérif. de lien affiche un avertissement et te laisse confirmer.
- Maman n'a pas de compte : « Maman » = profil par défaut après le PIN. Les paniers sont liés au cookie de son navigateur.
