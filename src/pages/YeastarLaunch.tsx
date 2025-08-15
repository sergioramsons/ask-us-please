import { Navigate, useLocation } from "react-router-dom";

export default function YeastarLaunch() {
  const location = useLocation();
  const search = new URLSearchParams(location.search);

  // Ensure popup=helpdesk is present
  if (!search.get("popup")) {
    search.set("popup", "helpdesk");
  }

  // Persist launch context in case auth redirects drop query params
  try {
    sessionStorage.setItem("yeastarLaunch", "1");
    const phone = search.get("phone");
    if (phone) sessionStorage.setItem("yeastarPhone", phone);
  } catch {}

  // Redirect to home with preserved params
  return <Navigate to={`/?${search.toString()}`} replace />;
}
