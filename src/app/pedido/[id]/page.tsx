import OrderConfirmation from "@/components/OrderConfirmation";
export const metadata = {
  title: "Sua solicitação",
  robots: { index: false, follow: false },
};
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return <OrderConfirmation id={(await params).id} />;
}
