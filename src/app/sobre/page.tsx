import Link from 'next/link';
import { Container } from '@/components/ui/container';
import { site } from '@/lib/site';

/**
 * Existe porque quem chega de uma busca precisa saber em quem está confiando —
 * não porque "todo site tem um sobre".
 */

export const metadata = {
  title: 'Sobre',
  description: 'O que é o Mirante, de onde vêm os dados e o que ele não faz.',
};

export default function AboutPage() {
  return (
    <Container width="prose" className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl">Sobre o Mirante</h1>
        <p className="text-text-secondary text-sm">{site.tagline}.</p>
      </header>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg">O que é</h2>
        <p className="text-text-secondary text-sm">
          Uma ferramenta pública para acompanhar ações e fundos imobiliários da B3. Você vê como o
          mercado está hoje, abre um ativo para entender como ele se comportou, e monta uma lista do
          que interessa. Sem cadastro, sem propaganda.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg">De onde vêm os dados</h2>
        <p className="text-text-secondary text-sm">
          Da{' '}
          <a
            href="https://brapi.dev"
            rel="noreferrer noopener external"
            target="_blank"
            className="text-accent hover:text-accent-hover underline decoration-1 underline-offset-2"
          >
            brapi.dev
          </a>
          , no plano gratuito. Os preços têm atraso e cada tela diz de quando é o dado que mostra.
          Quando a fonte não responde, aparece um preço de reserva, sempre identificado como tal —
          preferimos dizer que o dado é antigo a fingir que é de agora.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg">O que o plano gratuito não entrega</h2>
        <p className="text-text-secondary text-sm">
          Histórico de até três meses, e nada de dividendos. Por consequência, um fundo imobiliário
          aqui não mostra dividend yield nem P/VP — as duas métricas que um investidor de FII
          procura primeiro. Preferimos dizer isso a estimar número que a fonte não deu.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg">Sua lista</h2>
        <p className="text-text-secondary text-sm">
          Fica guardada no seu navegador, neste dispositivo. Não há conta, não há servidor com seus
          dados, e nada é enviado para nós. Se limpar os dados do site, a lista vai com eles — por
          isso existe o link de compartilhar, que carrega a lista na própria URL.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg">O que o Mirante não faz</h2>
        <p className="text-text-secondary text-sm">
          Não é corretora: não se compra nem se vende nada aqui. Não dá recomendação, não monta
          ranking, não calcula imposto e não tem carteira com preço médio. De um mirante se observa.
        </p>
      </section>

      <section className="border-border flex flex-col gap-2 border-t pt-5">
        <h2 className="text-lg">Aviso</h2>
        <p className="text-text-secondary text-sm">{site.disclaimer}</p>
      </section>

      <p className="text-text-muted text-sm">
        <Link href="/" className="hover:text-text underline decoration-1 underline-offset-2">
          Ver o mercado
        </Link>
      </p>
    </Container>
  );
}
