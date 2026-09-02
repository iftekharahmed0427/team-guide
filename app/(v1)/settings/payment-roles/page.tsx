import { getPaymentRoles } from "@/lib/payments";
import RolesManager from "./roles-manager";

// Admin-only (the Settings layout gates non-admins). Manage the catalog of roles
// shown in the /payments Role column.
export default async function PaymentRolesPage() {
  const roles = await getPaymentRoles();

  return (
    <div className="fx-rise mx-auto flex w-full max-w-2xl flex-col gap-4">
      <div>
        <h2 className="text-sm font-semibold tracking-tight">Payment roles</h2>
        <p className="text-xs text-muted">
          The role options shown in the Payments table. Add, rename, or remove them here.
        </p>
      </div>

      <RolesManager roles={roles} />
    </div>
  );
}
