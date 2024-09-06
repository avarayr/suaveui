# SuaveUI Beta

SuaveUI is an experimental PWA chat UI built specifically for interacting with Local AI Models.

# Demo GIF

<img width="280" src="https://github.com/user-attachments/assets/6446ba15-e13e-44cb-b3f2-c060f1333a38" />


# Running (using Docker 🐳)

You can easily run the latest version of SuaveUI using Docker. Follow these steps:

1. **Pull the latest image:**

   ```bash
   docker pull ghcr.io/avarayr/suaveui:latest
   ```

2. **Run the container:**

   ```bash
   docker run -p 3005:3005 --add-host localhost:host-gateway ghcr.io/avarayr/suaveui:latest
   ```

3. Go to http://localhost:3005

# Development

While SuaveUI is in early alpha, installation is via cloning and running a server

Requirements: Bun, Node

1. `git clone https://github.com/avarayr/suaveui`
2. `bun install`
3. `bun dev`

# Technologies used

React for UI, Node.js as light backend

<img width="200" alt="Screenshot 2024-08-26 at 1 35 36 PM" src="https://github.com/user-attachments/assets/2d534357-439e-4932-8829-a831d3599f4d">
<img width="200" alt="Screenshot 2024-08-26 at 1 36 00 PM" src="https://github.com/user-attachments/assets/98f67aff-6558-4d9b-af2f-83ebe03bd66b">
<img width="200" alt="Screenshot 2024-08-26 at 1 36 06 PM" src="https://github.com/user-attachments/assets/43d1ca46-b6c1-44ca-a14a-24b71d02da97">
<img width="200" alt="Screenshot 2024-08-26 at 1 39 59 PM" src="https://github.com/user-attachments/assets/b82f69aa-eac9-4eb0-8c84-55c15f367c00">

# Experimental

This repository is a work in progress.
