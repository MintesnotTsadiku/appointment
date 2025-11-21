const featureList = [
  {
    title: "Booking Experience",
    description: "The modern Date & Time selector your customers already love.",
  },
  {
    title: "Multi-Provider",
    description: "Easily onboard your entire clinic and switch between providers.",
  },
  {
    title: "Smart Availability",
    description: "Quick templates (+24h Mon-Sat) keep setup under 5 minutes.",
  },
  {
    title: "Actionable Dashboard",
    description: "Monitor bookings, revenue and next steps in one place.",
  },
];

export const HomeFeatureGrid = () => {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      {featureList.map((feature) => (
        <div
          key={feature.title}
          className="bg-white dark:bg-gray-900/70 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 flex items-start gap-4 shadow-lg"
        >
          <div className="h-12 w-12 rounded-2xl bg-primary-50 dark:bg-primary-900/30 text-primary-600 flex items-center justify-center">
            •
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{feature.title}</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">{feature.description}</p>
          </div>
        </div>
      ))}
    </div>
  );
};
