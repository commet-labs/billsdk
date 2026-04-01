import { HomeLayout } from "@/components/layout/home";
import { baseOptions, githubLink } from "@/lib/layout.shared";

export default function Layout({ children }: LayoutProps<"/">) {
  return (
    <HomeLayout {...baseOptions()} links={[githubLink]}>
      {children}
    </HomeLayout>
  );
}
