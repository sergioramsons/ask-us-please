import { Navigate, useLocation } from "react-router-dom";

export default function YeastarLaunch() {
  const location = useLocation();
  const search = new URLSearchParams(location.search);

  // Ensure popup=helpdesk is present
  if (!search.get("popup")) {
    search.set("popup", "helpdesk");
  }

  // Redirect to home with preserved params
  return <Navigate to={`/?${search.toString()}`} replace />;
}
