import CartPage from "@/components/CartPage";
export const metadata = {
  title: "Seu carrinho",
  robots: { index: false, follow: false },
};
export default function Page() {
  return <CartPage />;
}
