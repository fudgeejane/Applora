
import { Mail, MessageCircle } from "lucide-react";
import { useStyle } from "../../components/ui/Style";

function ContactPage() {
  const style = useStyle();

  const handleSubmit = (event) => {
    event.preventDefault();
    alert("Contact form submitted. Backend integration will come later.");
  };

  return (
    <section className={`min-h-screen px-6 pb-20 pt-36 ${style.primaryBg}`}>
      <div className="mx-auto max-w-3xl">
        <div className="text-center">
          <Mail className="mx-auto text-blue-600" size={35} />

          <h1 className={`mt-5 text-4xl font-bold ${style.headingText}`}>
            Contact Us
          </h1>

          <p className={`mt-4 ${style.secondaryText}`}>
            Have a question or need assistance? Send us a message.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className={`mt-12 space-y-5 rounded-2xl border p-7 sm:p-10 ${style.card}`}
        >
          <div>
            <label className="mb-2 block text-sm font-medium">
              Full Name
            </label>
            <input
              required
              type="text"
              placeholder="Enter your full name"
              className={`${style.input} ${style.inputFocus}`}
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">
              Email Address
            </label>
            <input
              required
              type="email"
              placeholder="Enter your email"
              className={`${style.input} ${style.inputFocus}`}
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">
              Subject
            </label>
            <input
              required
              type="text"
              placeholder="What is your message about?"
              className={`${style.input} ${style.inputFocus}`}
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">
              Message
            </label>
            <textarea
              required
              rows="5"
              placeholder="Write your message..."
              className={`${style.input} ${style.inputFocus} resize-none`}
            />
          </div>

          <button
            type="submit"
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 py-3 font-semibold text-white transition hover:bg-blue-700"
          >
            <MessageCircle size={18} />
            Send Message
          </button>
        </form>
      </div>
    </section>
  );
}

export default ContactPage;
