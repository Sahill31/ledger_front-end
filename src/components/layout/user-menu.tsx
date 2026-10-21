import { useNavigate } from "react-router-dom";
import { LogOut, Settings, UserRound } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/features/auth/auth-context";
import type { SessionUser } from "@/types";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function initials(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function UserMenu({ user, profilePath }: { user: SessionUser; profilePath: string }) {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const onLogout = async () => {
    await logout();
    toast.success("Signed out.");
    navigate("/login", { replace: true });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-9 gap-2 px-2" aria-label="Account menu">
          <Avatar className="h-7 w-7">
            <AvatarFallback>{initials(user.name)}</AvatarFallback>
          </Avatar>
          <span className="hidden text-left md:block">
            <span className="block text-xs font-semibold leading-tight">{user.name}</span>
            <span className="block text-[11px] capitalize leading-tight text-muted-foreground">{user.role}</span>
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <span className="block text-sm font-semibold text-foreground">{user.name}</span>
          <span className="block text-xs font-normal">{user.email}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => navigate(profilePath)}>
          {profilePath.includes("settings") ? <Settings /> : <UserRound />}
          {profilePath.includes("settings") ? "Settings" : "My profile"}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onLogout} className="text-red-600 focus:text-red-600">
          <LogOut /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
