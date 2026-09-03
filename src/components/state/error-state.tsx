import { FAILURE_MESSAGES, type FailureReason } from '@/lib/market/result';

/**
 * Falha de uma seção, não da página.
 *
 * Nenhum motivo vira "algo deu errado": cada um diz o que aconteceu e o que
 * ainda funciona. Erro parcial degrada a seção — a tabela continua na tela
 * mesmo quando a série histórica não vem.
 */

const RECOVERY: Record<FailureReason, string> = {
  unavailable: 'O resto da página continua válido. Tente de novo em alguns minutos.',
  'rate-limited': 'Foram consultas demais em pouco tempo. Em um minuto volta ao normal.',
  'quota-exhausted': 'O histórico volta no início do próximo ciclo. Os preços continuam atuais.',
  'not-found': 'Confira o código do ativo.',
  'invalid-symbol': 'Códigos da B3 têm quatro letras e um ou dois números, como PETR4 ou HGLG11.',
};

interface SectionErrorProps {
  readonly reason: FailureReason;
  /** O que especificamente falhou, na língua do produto. */
  readonly subject: string;
}

export function SectionError({ reason, subject }: SectionErrorProps) {
  return (
    <div
      role="note"
      className="border-border bg-bg-subtle text-text-secondary rounded-md border px-4 py-5 text-sm"
    >
      <p className="text-text font-medium">{subject} não está disponível agora.</p>
      <p className="mt-1">
        {FAILURE_MESSAGES[reason]} {RECOVERY[reason]}
      </p>
    </div>
  );
}
