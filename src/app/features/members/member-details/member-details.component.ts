import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { AlertComponent } from '../../../components/alert/alert.component';
import { BookLineComponent } from '../../../components/book-line/book-line.component';
import { AuthService } from '../../../core/auth/auth.service';
import { Loan } from '../../../core/models/loan.model';
import { MemberDetail } from '../../../core/models/member.model';
import { formatDate, formatDayMonth, today } from '../../../utils/dates';
import { formatPhone, initials, plural } from '../../../utils/format';
import { MAX_BOOKS_PER_MEMBER } from '../../desk/desk-rules';
import { loanState } from '../../loans/loan-register';

/** The view mode of the member drawer: who they are, what they have now, what they returned and gave. */
@Component({
  selector: 'app-member-details',
  imports: [AlertComponent, BookLineComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './member-details.component.html',
  host: { class: 'flex flex-col gap-5' },
})
export class MemberDetailsComponent {
  protected readonly auth = inject(AuthService);

  readonly detail = input.required<MemberDetail>();
  readonly returnRequested = output<Loan>();

  private readonly today = today();
  protected readonly maxBooks = MAX_BOOKS_PER_MEMBER;
  protected readonly m = computed(() => this.detail().member);
  protected readonly initials = computed(() => initials(this.m().fullName));
  protected readonly phone = computed(() => (this.m().phone ? formatPhone(this.m().phone) : 'No phone saved'));
  protected readonly current = computed(() =>
    this.detail().currentLoans.map((loan) => ({ loan, state: loanState(loan, this.today), due: formatDayMonth(loan.dueDate) })),
  );
  protected readonly recent = computed(() =>
    this.detail().recentLoans.map((loan) => ({
      loan,
      state: loanState(loan, this.today),
      when: `${formatDayMonth(loan.borrowedAt)} – ${loan.returnedAt ? formatDayMonth(loan.returnedAt) : ''}`,
    })),
  );
  protected readonly donations = computed(() =>
    this.detail().donations.map((d) => ({
      donation: d,
      when: formatDate(d.receivedAt),
      what: d.titles.length > 3 ? `${d.titles.slice(0, 3).join(', ')} and ${d.titles.length - 3} more` : d.titles.join(', '),
    })),
  );

  protected readonly plural = plural;
}
