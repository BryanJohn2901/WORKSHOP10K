import re

with open('index.html', 'r') as f:
    content = f.read()

# 1. Colors - Escurecendo tons para ficar mais elegante e criando mais contraste com o dourado
content = content.replace("bg: '#143529'", "bg: '#071F16'")
content = content.replace("surface: '#117355'", "surface: '#0A2D20'")
content = content.replace("darkgray: '#0d221a'", "darkgray: '#03110C'")

# 2. Badge da Hero - Mais glow e borda brilhante
content = content.replace(
    'border border-brand-primary/30 bg-brand-primary/10 text-brand-primary text-xs font-bold uppercase tracking-[0.15em] mb-8 backdrop-blur-sm', 
    'border border-brand-primary/50 bg-brand-primary/15 text-[#EBCE85] text-xs font-bold uppercase tracking-[0.2em] mb-8 backdrop-blur-md shadow-[0_0_20px_rgba(205,155,83,0.2)]'
)

# 3. Metallic Gradients - Dando aspecto de ouro real aos textos em destaque
content = content.replace(
    'bg-gradient-to-r from-brand-primary to-brand-primaryHover', 
    'bg-gradient-to-r from-[#CD9B53] via-[#EBCE85] to-[#B87A40]'
)

# 4. Buttons - Gradiente animado estilo metálico com borda elegante
content = content.replace(
    'bg-brand-primary hover:bg-brand-primaryHover', 
    'bg-gradient-to-r from-[#B87A40] via-[#EBCE85] to-[#CD9B53] bg-[length:200%_auto] hover:bg-right border border-[#EBCE85]/50 transition-all duration-500'
)
# Arrumando especificamente o botão de submit do popup
content = content.replace(
    'w-full bg-brand-primary text-brand-darkgray font-sans', 
    'w-full bg-gradient-to-r from-[#B87A40] via-[#EBCE85] to-[#CD9B53] bg-[length:200%_auto] hover:bg-right border border-[#EBCE85]/50 transition-all duration-500 text-brand-darkgray font-sans'
)

# 5. Cards Glassmorphism - Blur e sombras mais fortes para sensação de profundidade/vidro
content = content.replace(
    'bg-white/5 border border-white/10 rounded-3xl p-8 hover:border-brand-primary/50 transition-colors duration-300', 
    'bg-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur-xl hover:border-[#CD9B53]/40 hover:bg-white/[0.07] hover:shadow-[0_0_40px_rgba(205,155,83,0.15)] transition-all duration-500'
)
content = content.replace(
    'bg-white/5 border border-white/10 rounded-3xl p-8 hover:shadow-[0_0_30px_rgba(205,155,83,0.15)] transition-all duration-300', 
    'bg-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur-xl hover:shadow-[0_0_40px_rgba(205,155,83,0.25)] hover:border-[#CD9B53]/30 transition-all duration-500'
)

# 6. Mentors Icon Box Glow - Adicionando glow no icone para destacar
content = content.replace(
    'bg-brand-surface rounded-full border-4 border-brand-primary', 
    'bg-brand-surface rounded-full border-4 border-[#CD9B53] shadow-[0_0_30px_rgba(205,155,83,0.3)]'
)

with open('index.html', 'w') as f:
    f.write(content)
