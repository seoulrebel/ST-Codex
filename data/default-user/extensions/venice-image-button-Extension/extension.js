// Venice Image Button — SillyTavern **extension**
// Adds a “Venice Image” button that sends the current chat-input text
// to Venice AI’s image-generation endpoint and posts the result.

module.exports = {
  name:   "Venice Image Button",
  description: "Generate an image with Venice AI from the current chat input",
  version: "1.2.2",
  authors: ["Rob"],          // credit yourself!

  onLoad(api) {
    api.addButton("Venice Image", async () => {
      /* 1️⃣ Get the user’s prompt */
      const prompt = api.getInput()?.trim();
      if (!prompt) {
        return api.sendMessage("❌ No prompt found in chat input. Please type your prompt first.");
      }
      api.clearInput();

      /* 2️⃣ Build the Venice request */
      const body = {
        model: "fluently-xl",
        prompt,
        style_preset: "3D Model",
        width: 1024,
        height: 1024,
        steps: 30,
        cfg_scale: 7.5,
        seed: Math.floor(Math.random() * 1e9),
        lora_strength: 50,
        safe_mode: false,
        return_binary: false,
        hide_watermark: false
      };

      /* 3️⃣ Call Venice AI */
      try {
        const res  = await fetch("https://api.venice.ai/api/v1/image/generate", {
          method:  "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer 3NTCWsv3WhkHjRqZcuE-R6mJLmGJbpKvD0GbkOdv3v"
          },
          body: JSON.stringify(body)
        });
        const data = await res.json();

        /* 4️⃣ Post the image link back into chat */
        if (data.image_url) {
          api.sendMessage(`![Venice AI Image](${data.image_url})`);
        } else if (Array.isArray(data.images) && data.images.length) {
          api.sendMessage(`![Venice AI Image](${data.images[0].url})`);
        } else {
          api.sendMessage("❌ Venice AI failed to generate an image.");
        }
      } catch (err) {
        console.error("Venice API error:", err);
        api.sendMessage("❌ Error contacting Venice AI.");
      }
    });
  }
};