import { Switch, Route, Router } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";

import SetupPage from "./pages/Setup";
import HomePage from "./pages/Home";
import RecordPage from "./pages/Record";
import RecordFormPage from "./pages/RecordForm";
import DashboardPage from "./pages/Dashboard";
import PortfolioPage from "./pages/Portfolio";
import OrientationPage from "./pages/Orientation";
import SurveyPage from "./pages/Survey";
import PledgePage from "./pages/Pledge";
import AdminPage from "./pages/Admin";
import AiChatPage from "./pages/AiChat";
import NotFound from "./pages/not-found";

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router hook={useHashLocation}>
        <Switch>
          <Route path="/" component={HomePage} />
          <Route path="/setup" component={SetupPage} />
          <Route path="/record" component={RecordFormPage} />
          <Route path="/record/:id" component={RecordPage} />
          <Route path="/dashboard" component={DashboardPage} />
          <Route path="/portfolio" component={PortfolioPage} />
          <Route path="/orientation" component={OrientationPage} />
          <Route path="/survey" component={SurveyPage} />
          <Route path="/pledge" component={PledgePage} />
          <Route path="/admin" component={AdminPage} />
          <Route path="/chat" component={AiChatPage} />
          <Route component={NotFound} />
        </Switch>
      </Router>
      <Toaster />
    </QueryClientProvider>
  );
}
