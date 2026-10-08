addEventListener(
  "hayatBackgroundTask",
  async () => {

    console.log(
      "Hayat background task started"
    );

    try {

      const response =
        await fetch(
          "http://127.0.0.1:8787/health"
        );

      const data =
        await response.json();

      console.log(
        "Agent status:",
        data
      );

    } catch (error) {

      console.error(
        "Background agent error:",
        error
      );
    }
  }
);
