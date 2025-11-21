const testimonials = [
  {
    quote:
      "We finished onboarding in 7 minutes and started taking appointments the same afternoon.",
    name: "Dr. Amara T.",
    role: "Founder, Addis Wellness Clinic",
  },
  {
    quote: "My team of 6 providers can see their schedules without digging through ERPNext.",
    name: "Yonas K.",
    role: "Operations, Glow Salon",
  },
];

export const HomeTestimonials = () => (
  <div className="grid gap-6 md:grid-cols-2">
    {testimonials.map((testimonial) => (
      <div
        key={testimonial.name}
        className="bg-white dark:bg-gray-900/70 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow-lg"
      >
        <p className="text-gray-900 dark:text-gray-100 text-lg italic mb-4">“{testimonial.quote}”</p>
        <div>
          <p className="font-semibold text-gray-900 dark:text-white">{testimonial.name}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">{testimonial.role}</p>
        </div>
      </div>
    ))}
  </div>
);
