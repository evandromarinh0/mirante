import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DataStamp, DataOriginNotice } from '@/components/state/data-stamp';
import { EmptyState } from '@/components/state/empty-state';
import { SectionError } from '@/components/state/error-state';
import { SiteFooter } from '@/components/layout/site-footer';
import { ValueChange } from '@/components/ui/value-change';
import { getMarketStatus } from '@/lib/market/market-status';
import { isLiveData } from '@/lib/market/result';
import { site } from '@/lib/site';

const NOW = new Date('2026-09-03T13:10:00Z'); // pregão aberto
const CLOSED = new Date('2026-09-05T15:00:00Z'); // sábado

const origin = (over: Partial<Parameters<typeof DataStamp>[0]['origin']> = {}) => ({
  provider: 'brapi' as const,
  fetchedAt: '2026-09-03T13:08:00Z',
  fallback: false,
  ...over,
});

describe('aviso de não-afiliação', () => {
  // Regra do projeto: projeto pessoal nunca pode ser confundido com produto de
  // empregador. O aviso é obrigatório e por isso é testado, não confiado.
  it('aparece no rodapé de toda página', () => {
    render(<SiteFooter />);
    expect(screen.getByTestId('disclaimer')).toHaveTextContent(site.disclaimer);
  });

  it('diz que não há vínculo e que nada é recomendação', () => {
    render(<SiteFooter />);
    const text = screen.getByTestId('disclaimer').textContent ?? '';
    expect(text).toMatch(/sem vínculo/i);
    expect(text).toMatch(/recomendação de investimento/i);
  });
});

describe('ValueChange', () => {
  it('mostra sinal no texto, e não só cor', () => {
    render(<ValueChange value={1.33} percent={2.84} display="both" />);
    expect(screen.getByText(/\+2,84%/)).toBeInTheDocument();
    expect(screen.getByText(/\+R\$/)).toBeInTheDocument();
  });

  it('usa o sinal de menos também na baixa', () => {
    render(<ValueChange value={-0.5} percent={-1.2} />);
    expect(screen.getByText(/-1,20%/)).toBeInTheDocument();
  });

  it('mantém a seta fora da leitura de tela', () => {
    const { container } = render(<ValueChange value={0} percent={0} />);
    expect(container.querySelector('[aria-hidden="true"]')).not.toBeNull();
  });
});

describe('DataStamp', () => {
  it('com mercado aberto, diz quando foi consultado', () => {
    render(<DataStamp origin={origin()} status={getMarketStatus(NOW)} now={NOW} />);
    expect(screen.getByText('Mercado aberto')).toBeInTheDocument();
    expect(screen.getByText(/há 2 minutos/)).toBeInTheDocument();
  });

  it('com mercado fechado, diz de quando é o último fechamento', () => {
    render(<DataStamp origin={origin()} status={getMarketStatus(CLOSED)} now={CLOSED} />);
    expect(screen.getByText('Mercado fechado')).toBeInTheDocument();
    expect(screen.getByText(/fechamento de sexta-feira/)).toBeInTheDocument();
  });

  it('identifica dado de reserva', () => {
    render(
      <DataStamp
        origin={origin({ provider: 'snapshot', fallback: true })}
        status={getMarketStatus(NOW)}
        now={NOW}
      />,
    );
    expect(screen.getByText('dado de reserva')).toBeInTheDocument();
  });
});

describe('procedência do dado', () => {
  // A produção já serviu fixture parecendo ao vivo. Estes testes existem para
  // que dado não-ao-vivo nunca volte a passar por fresco.
  it('não avisa nada quando o dado é do mercado ao vivo', () => {
    const { container } = render(<DataOriginNotice origin={origin()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('reserva diz que não é a cotação de agora', () => {
    render(<DataOriginNotice origin={origin({ provider: 'snapshot', fallback: true })} />);
    expect(screen.getByRole('note')).toHaveTextContent(/não são a cotação de agora/i);
  });

  it('fixture se identifica como exemplo, não como mercado ao vivo', () => {
    render(<DataOriginNotice origin={origin({ provider: 'fixture' })} />);
    expect(screen.getByRole('note')).toHaveTextContent(/Dado de exemplo/i);
    expect(screen.getByRole('note')).toHaveTextContent(/não é o mercado ao vivo/i);
  });

  it('o carimbo rotula exemplo mesmo com o pregão aberto', () => {
    render(
      <DataStamp
        origin={origin({ provider: 'fixture' })}
        status={getMarketStatus(NOW)}
        now={NOW}
      />,
    );
    expect(screen.getByText('dado de exemplo')).toBeInTheDocument();
    // Com dado capturado, 'consultado há 2 minutos' seria mentira.
    expect(screen.queryByText(/há 2 minutos/)).not.toBeInTheDocument();
  });

  it('não diz "mercado aberto" e "fechamento de" na mesma frase', () => {
    // Era o que aparecia com dado capturado durante o pregão: as duas
    // informações lado a lado, se contradizendo na cara de quem lê.
    const { container } = render(
      <DataStamp
        origin={origin({ provider: 'fixture' })}
        status={getMarketStatus(NOW)}
        now={NOW}
      />,
    );
    const text = container.textContent ?? '';

    expect(text).toContain('Mercado aberto');
    expect(text).not.toContain('fechamento de');
    expect(text).toContain('capturado em');
  });

  it('isLiveData só aceita a fonte de produção', () => {
    expect(isLiveData(origin())).toBe(true);
    expect(isLiveData(origin({ provider: 'fixture' }))).toBe(false);
    expect(isLiveData(origin({ provider: 'snapshot', fallback: true }))).toBe(false);
    expect(isLiveData(origin({ fallback: true }))).toBe(false);
  });
});

describe('estados vazios e de erro', () => {
  it('o estado vazio oferece um caminho de um clique', () => {
    render(
      <EmptyState
        title="Sua lista está vazia."
        description="Acompanhe um ativo pela estrela."
        action={{ href: '/', label: 'Ver o mercado' }}
      />,
    );
    expect(screen.getByRole('link', { name: 'Ver o mercado' })).toHaveAttribute('href', '/');
  });

  it('o erro de seção nomeia o que falhou e o que continua válido', () => {
    render(<SectionError reason="quota-exhausted" subject="O histórico deste ativo" />);
    const note = screen.getByRole('note');
    expect(note).toHaveTextContent(/O histórico deste ativo não está disponível agora/);
    expect(note).toHaveTextContent(/preços continuam atuais/i);
  });

  it('não usa mensagem genérica para motivo conhecido', () => {
    render(<SectionError reason="rate-limited" subject="A tabela" />);
    expect(screen.getByRole('note')).not.toHaveTextContent(/algo deu errado/i);
  });
});
