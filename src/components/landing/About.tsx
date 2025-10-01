import { Scissors, Heart, Zap, Users } from "lucide-react";

const values = [
  {
    icon: Scissors,
    title: "Crafted for Tailors",
    description: "Built by understanding the unique needs of tailoring businesses.",
  },
  {
    icon: Heart,
    title: "Customer First",
    description: "Helping you deliver exceptional service to your customers.",
  },
  {
    icon: Zap,
    title: "Fast & Reliable",
    description: "Lightning-fast performance with 99.9% uptime guarantee.",
  },
  {
    icon: Users,
    title: "Community Driven",
    description: "Constantly improving based on feedback from real tailor shops.",
  },
];

export default function About() {
  return (
    <section id="about" className="py-20 px-4 bg-muted/30">
      <div className="container mx-auto">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div>
            <h2 className="text-3xl md:text-5xl font-bold mb-6">
              Built for Modern Tailor Shops
            </h2>
            <p className="text-lg text-muted-foreground mb-6">
              TailorPro was created after years of working with tailor shops and understanding
              their daily challenges. We saw the need for a modern, easy-to-use system that
              could handle everything from order management to customer relationships.
            </p>
            <p className="text-lg text-muted-foreground mb-8">
              Today, we help hundreds of tailor shops streamline their operations, reduce
              errors, and grow their business. Our mission is to empower tailors with
              technology that makes their work easier and more profitable.
            </p>
            
            <div className="grid grid-cols-2 gap-6">
              <div>
                <div className="text-3xl font-bold text-primary mb-2">2019</div>
                <div className="text-sm text-muted-foreground">Founded</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-primary mb-2">500+</div>
                <div className="text-sm text-muted-foreground">Shops Served</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-primary mb-2">50k+</div>
                <div className="text-sm text-muted-foreground">Orders Processed</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-primary mb-2">24/7</div>
                <div className="text-sm text-muted-foreground">Support</div>
              </div>
            </div>
          </div>

          {/* Right Content - Values */}
          <div className="grid sm:grid-cols-2 gap-6">
            {values.map((value, index) => {
              const Icon = value.icon;
              return (
                <div
                  key={index}
                  className="p-6 bg-card rounded-lg border border-border hover:shadow-elegant transition-smooth"
                >
                  <div className="w-12 h-12 rounded-lg gradient-primary flex items-center justify-center mb-4">
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="font-semibold mb-2">{value.title}</h3>
                  <p className="text-sm text-muted-foreground">{value.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
