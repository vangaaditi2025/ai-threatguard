"""add scan reports table

Revision ID: 0003_scan_reports
Revises: 0002_auth_tables
Create Date: 2026-08-06 17:30:00.000000
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '0003_scan_reports'
down_revision = '0002_auth_tables'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'scan_reports',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('filename', sa.String(length=512), nullable=False),
        sa.Column('content_type', sa.String(length=255), nullable=False),
        sa.Column('file_type', sa.String(length=100), nullable=False),
        sa.Column('sha256', sa.String(length=64), nullable=False, unique=True),
        sa.Column('risk_score', sa.Integer(), nullable=False),
        sa.Column('classification', sa.String(length=50), nullable=False),
        sa.Column('report_data', sa.JSON(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )


def downgrade():
    op.drop_table('scan_reports')
