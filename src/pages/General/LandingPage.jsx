import { Card, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Heart, Users, Target, TrendingUp } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="bg-gradient-to-br from-primary/10 via-background to-primary/5">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
            <div className="text-center">
              <div className="flex justify-center mb-8">
                <div className="w-20 h-20 bg-primary rounded-2xl flex items-center justify-center">
                  <Heart className="h-10 w-10 text-white" />
                </div>
              </div>
              <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
                Fun With Mama
              </h1>
              <p className="text-xl md:text-2xl text-gray-600 mb-8 max-w-3xl mx-auto">
                Project Management Hub
              </p>
              <p className="text-lg text-gray-500 mb-12 max-w-2xl mx-auto">
                Streamline your educational content creation with real-time
                project tracking, team collaboration, and comprehensive
                reporting.
              </p>
              <Button
                size="lg"
                className="bg-primary hover:bg-primaryDark text-white px-8 py-3 text-lg"
                onClick={() => (window.location.href = "/Login")}
                data-testid="button-login"
              >
                Sign In to Continue
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Powerful Project Management Features
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Everything you need to manage your educational content projects
              efficiently
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card className="border-gray-200 hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <Target className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Real-Time Project Tracking
                </h3>
                <p className="text-gray-600">
                  Monitor project progress with live status updates, comments,
                  and notifications.
                </p>
              </CardContent>
            </Card>

            <Card className="border-gray-200 hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="w-12 h-12 bg-success/10 rounded-lg flex items-center justify-center mb-4">
                  <Users className="h-6 w-6 text-success" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Role-Based Access Control
                </h3>
                <p className="text-gray-600">
                  Secure access with Admin, Manager, Employee, and Executive
                  roles.
                </p>
              </CardContent>
            </Card>

            <Card className="border-gray-200 hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="w-12 h-12 bg-warning/10 rounded-lg flex items-center justify-center mb-4">
                  <TrendingUp className="h-6 w-6 text-warning" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Comprehensive Reporting
                </h3>
                <p className="text-gray-600">
                  Generate detailed reports and audit trails for all project
                  activities.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-gray-50 py-16">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Ready to streamline your projects?
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            Join your team and start managing educational content projects more
            efficiently.
          </p>
          <Button
            size="lg"
            className="bg-primary hover:bg-primaryDark text-white px-8 py-3"
            onClick={() => (window.location.href = "/api/login")}
            data-testid="button-login-cta"
          >
            Get Started Now
          </Button>
        </div>
      </div>
    </div>
  );
}
