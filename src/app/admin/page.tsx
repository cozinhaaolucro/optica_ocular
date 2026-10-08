import AdminPanel from "@/components/AdminPanel";
import "./admin.css";
export const metadata = {
  title: "Painel da loja",
  robots: { index: false, follow: false },
};
export default function Page() {
  return <AdminPanel />;
}
