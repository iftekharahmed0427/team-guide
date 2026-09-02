import { notFound } from "next/navigation";

// Catches any URL that matches no real route and hands it to the (app) group's
// not-found boundary. Without this, an unmatched path has no matching segment,
// so Next renders the root not-found outside the layout - and the 404 would come
// up with no sidebar.
//
// It cannot shadow a real page: Next ranks static segments above dynamic ones
// and both above a catch-all, so every route in the app still wins here. Route
// handlers under app/api are matched separately and are unaffected.

export default function UnmatchedRoute() {
  notFound();
}
