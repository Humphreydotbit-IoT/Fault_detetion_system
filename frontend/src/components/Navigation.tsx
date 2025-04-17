
import { Link, useLocation } from "react-router-dom";
import { Clock, LogOut, ChartBar } from "lucide-react";
import { format } from "date-fns";
import { useState, useEffect } from "react";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/AuthProvider";

const Navigation = () => {
  const location = useLocation();
  const { signOut } = useAuth();
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const ListItem = ({
    className,
    title,
    to,
    children,
  }: {
    className?: string;
    title: string;
    to: string;
    children: React.ReactNode;
  }) => (
    <li>
      <NavigationMenuLink asChild>
        <Link
          to={to}
          className={cn(
            "block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
            location.pathname === to && "bg-accent text-accent-foreground",
            className
          )}
        >
          <div className="text-sm font-medium leading-none">{title}</div>
          <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
            {children}
          </p>
        </Link>
      </NavigationMenuLink>
    </li>
  );

  return (
    <div className="flex justify-between items-center px-4 py-2 bg-white shadow-sm">
      <NavigationMenu className="max-w-none justify-start">
        <NavigationMenuList>
          <NavigationMenuItem>
            <NavigationMenuTrigger>Floors</NavigationMenuTrigger>
            <NavigationMenuContent>
              <ul className="grid w-[400px] gap-3 p-4 md:w-[500px] md:grid-cols-2 lg:w-[600px]">
                <ListItem to="/floor/1" title="Floor 1">
                  View rooms and sensors on Floor 1
                </ListItem>
                <ListItem to="/floor/2" title="Floor 2">
                  View rooms and sensors on Floor 2
                </ListItem>
                <ListItem to="/floor/3" title="Floor 3">
                  View rooms and sensors on Floor 3
                </ListItem>
              </ul>
            </NavigationMenuContent>
          </NavigationMenuItem>

          <NavigationMenuItem>
            <NavigationMenuLink
              asChild
              className={cn(
                "group inline-flex h-10 w-max items-center justify-center rounded-md bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none disabled:pointer-events-none disabled:opacity-50 data-[active]:bg-accent/50 data-[state=open]:bg-accent/50",
                location.pathname === "/" && "bg-accent text-accent-foreground"
              )}
            >
              <Link to="/">Dashboard</Link>
            </NavigationMenuLink>
          </NavigationMenuItem>

          <NavigationMenuItem>
            <NavigationMenuLink
              asChild
              className={cn(
                "group inline-flex h-10 w-max items-center justify-center rounded-md bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none disabled:pointer-events-none disabled:opacity-50 data-[active]:bg-accent/50 data-[state=open]:bg-accent/50",
                location.pathname === "/analysis" && "bg-accent text-accent-foreground"
              )}
            >
              <Link to="/analysis">
                <div className="flex items-center gap-2">
                  <ChartBar size={16} />
                  <span>Analysis</span>
                </div>
              </Link>
            </NavigationMenuLink>
          </NavigationMenuItem>
        </NavigationMenuList>
      </NavigationMenu>

      <div className="absolute left-1/2 transform -translate-x-1/2 flex items-center space-x-2 text-gray-600">
        <Clock size={20} />
        <span>{format(currentTime, 'HH:mm:ss')}</span>
      </div>

      <button 
        onClick={signOut} 
        className="text-gray-600 hover:text-red-500 transition-colors"
        title="Logout"
      >
        <LogOut size={24} />
      </button>
    </div>
  );
};

export default Navigation;
